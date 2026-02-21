import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { blogPosts } from '@/lib/db/schema';
import { rawQuery } from '@/lib/db/raw-query';
import { desc, eq, and, sql } from 'drizzle-orm';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  league: string;
  leagueId: number;
  gameweek: number;
  season: string;
  publishedAt: string;
  content: string;
  keywords: string[];
  type?: 'preview' | 'review' | 'weekly-roundup' | 'analysis';
}

export interface BlogFilter {
  type?: string;
  leagueId?: number;
  page?: number;
  perPage?: number;
}

const BLOG_DIR = path.join(process.cwd(), 'data', 'blog');
const DEFAULT_PER_PAGE = 12;

let blogTableReady = false;

async function ensureBlogTable() {
  if (blogTableReady) return;
  try {
    await rawQuery(`
      DO $$ BEGIN
        CREATE TYPE predictify.blog_post_type AS ENUM ('preview', 'review', 'weekly-roundup', 'analysis');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await rawQuery(`
      DO $$ BEGIN
        CREATE TYPE predictify.blog_post_status AS ENUM ('draft', 'published', 'archived');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$
    `);
    await rawQuery(`
      CREATE TABLE IF NOT EXISTS predictify.blog_posts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        type predictify.blog_post_type NOT NULL,
        status predictify.blog_post_status NOT NULL DEFAULT 'published',
        league_id INTEGER,
        league_name TEXT,
        gameweek INTEGER,
        season TEXT,
        published_at TIMESTAMP NOT NULL DEFAULT now(),
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);
    blogTableReady = true;
  } catch {
    // Non-critical — will fall back to filesystem
  }
}

/** Get posts from filesystem (fallback) */
async function getFileSystemPosts(): Promise<BlogPost[]> {
  try {
    const files = await fs.readdir(BLOG_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    const posts = await Promise.all(
      jsonFiles.map(async (file) => {
        const raw = await fs.readFile(path.join(BLOG_DIR, file), 'utf-8');
        return JSON.parse(raw) as BlogPost;
      })
    );

    return posts.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  } catch {
    return [];
  }
}

/** Get all posts with optional filtering and pagination */
export async function getAllPosts(filter?: BlogFilter): Promise<{
  posts: BlogPost[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}> {
  const page = filter?.page ?? 1;
  const perPage = filter?.perPage ?? DEFAULT_PER_PAGE;

  // Try DB-backed index first
  await ensureBlogTable();
  try {
    const conditions = [eq(blogPosts.status, 'published')];

    if (filter?.type) {
      conditions.push(sql`${blogPosts.type} = ${filter.type}`);
    }
    if (filter?.leagueId) {
      conditions.push(eq(blogPosts.leagueId, filter.leagueId));
    }

    const [countResult, dbPosts] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(blogPosts).where(and(...conditions)),
      db
        .select()
        .from(blogPosts)
        .where(and(...conditions))
        .orderBy(desc(blogPosts.publishedAt))
        .limit(perPage)
        .offset((page - 1) * perPage),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    if (total > 0) {
      // Load content from files for each post
      const posts = await Promise.all(
        dbPosts.map(async (dbPost) => {
          const filePost = await getPostBySlug(dbPost.slug);
          return filePost ?? {
            slug: dbPost.slug,
            title: dbPost.title,
            description: dbPost.description ?? '',
            league: dbPost.leagueName ?? 'All Leagues',
            leagueId: dbPost.leagueId ?? 0,
            gameweek: dbPost.gameweek ?? 0,
            season: dbPost.season ?? '',
            publishedAt: dbPost.publishedAt.toISOString(),
            content: '',
            keywords: [],
            type: dbPost.type,
          };
        })
      );

      return { posts, total, page, perPage, totalPages: Math.ceil(total / perPage) };
    }
  } catch {
    // DB not available, fall through to filesystem
  }

  // Filesystem fallback
  let allPosts = await getFileSystemPosts();

  if (filter?.type) {
    allPosts = allPosts.filter((p) => p.type === filter.type);
  }
  if (filter?.leagueId) {
    allPosts = allPosts.filter((p) => p.leagueId === filter.leagueId);
  }

  const total = allPosts.length;
  const paginated = allPosts.slice((page - 1) * perPage, page * perPage);

  return {
    posts: paginated,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

/** Get a single post by slug (always from filesystem) */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const files = await fs.readdir(BLOG_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    for (const file of jsonFiles) {
      const raw = await fs.readFile(path.join(BLOG_DIR, file), 'utf-8');
      const post: BlogPost = JSON.parse(raw);
      if (post.slug === slug) return post;
    }
  } catch {
    // Blog directory may not exist
  }
  return null;
}

/** Get all slugs for static generation */
export async function getAllSlugs(): Promise<string[]> {
  const { posts } = await getAllPosts({ perPage: 1000 });
  return posts.map((p) => p.slug);
}

/** Index a blog post into the DB for fast querying */
export async function indexBlogPost(post: BlogPost): Promise<void> {
  await ensureBlogTable();
  try {
    const type = post.type ?? inferPostType(post.slug);

    await db
      .insert(blogPosts)
      .values({
        slug: post.slug,
        title: post.title,
        description: post.description,
        type,
        status: 'published',
        leagueId: post.leagueId || null,
        leagueName: post.league || null,
        gameweek: post.gameweek || null,
        season: post.season || null,
        publishedAt: new Date(post.publishedAt),
      })
      .onConflictDoUpdate({
        target: blogPosts.slug,
        set: {
          title: post.title,
          description: post.description,
          type,
          leagueId: post.leagueId || null,
          leagueName: post.league || null,
          gameweek: post.gameweek || null,
          season: post.season || null,
          publishedAt: new Date(post.publishedAt),
        },
      });
  } catch {
    // Non-critical
  }
}

function inferPostType(slug: string): 'preview' | 'review' | 'weekly-roundup' | 'analysis' {
  if (slug.includes('preview')) return 'preview';
  if (slug.includes('review') || slug.includes('results')) return 'review';
  if (slug.includes('roundup') || slug.includes('weekly')) return 'weekly-roundup';
  return 'analysis';
}
