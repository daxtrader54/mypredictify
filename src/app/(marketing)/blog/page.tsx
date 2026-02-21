import type { Metadata } from 'next';
import Link from 'next/link';
import { getAllPosts } from '@/lib/blog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { LEAGUES } from '@/config/leagues';
import { BlogFilters } from './blog-filters';

export const metadata: Metadata = {
  title: 'Football Predictions Blog | MyPredictify',
  description:
    'Weekly football match previews, predictions, and analysis across the Premier League, La Liga, Bundesliga, Serie A, and Ligue 1.',
  openGraph: {
    title: 'Football Predictions Blog | MyPredictify',
    description:
      'Weekly football match previews, predictions, and analysis across Europe\'s top 5 leagues.',
  },
};

const TYPE_LABELS: Record<string, string> = {
  preview: 'Preview',
  review: 'Review',
  'weekly-roundup': 'Roundup',
  analysis: 'Analysis',
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; league?: string; page?: string }>;
}) {
  const params = await searchParams;
  const type = params.type || undefined;
  const leagueId = params.league ? parseInt(params.league) : undefined;
  const page = params.page ? parseInt(params.page) : 1;

  const { posts, total, totalPages } = await getAllPosts({ type, leagueId, page, perPage: 12 });

  return (
    <div className="container py-16 max-w-4xl">
      <div className="mb-8 text-center">
        <Badge variant="secondary" className="mb-4">
          <BookOpen className="h-3 w-3 mr-1" />
          Blog
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold">Football Predictions Blog</h1>
        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
          Weekly match previews, AI-powered predictions, and analysis across Europe&apos;s top 5 leagues.
        </p>
      </div>

      <BlogFilters
        activeType={type}
        activeLeagueId={leagueId}
        leagues={LEAGUES.map((l) => ({ id: l.id, name: l.name, shortName: l.shortName, flag: l.flag }))}
      />

      {posts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No blog posts found. {type || leagueId ? 'Try adjusting your filters.' : 'Check back soon for weekly match previews!'}</p>
        </div>
      ) : (
        <>
          <div className="grid gap-6">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`}>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {post.type && (
                            <Badge variant="default" className="text-xs">
                              {TYPE_LABELS[post.type] ?? post.type}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {post.league}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            GW{post.gameweek}
                          </Badge>
                        </div>
                        <h2 className="text-lg font-semibold mb-1">{post.title}</h2>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.description}
                        </p>
                      </div>
                      <time
                        dateTime={post.publishedAt}
                        className="text-xs text-muted-foreground whitespace-nowrap"
                      >
                        {new Date(post.publishedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </time>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {page > 1 && (
                <Link
                  href={`/blog?${new URLSearchParams({ ...(type ? { type } : {}), ...(leagueId ? { league: String(leagueId) } : {}), page: String(page - 1) }).toString()}`}
                  className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} posts)
              </span>
              {page < totalPages && (
                <Link
                  href={`/blog?${new URLSearchParams({ ...(type ? { type } : {}), ...(leagueId ? { league: String(leagueId) } : {}), page: String(page + 1) }).toString()}`}
                  className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
