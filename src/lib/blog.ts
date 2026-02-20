import { promises as fs } from 'fs';
import path from 'path';

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
}

const BLOG_DIR = path.join(process.cwd(), 'data', 'blog');

export async function getAllPosts(): Promise<BlogPost[]> {
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

export async function getAllSlugs(): Promise<string[]> {
  const posts = await getAllPosts();
  return posts.map((p) => p.slug);
}
