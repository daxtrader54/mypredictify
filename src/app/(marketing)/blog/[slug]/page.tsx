import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAllSlugs, getPostBySlug } from '@/lib/blog';
import { Badge } from '@/components/ui/badge';
import { siteConfig } from '@/config/site';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BlogShare } from '@/components/blog/blog-share';

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: 'Post Not Found' };

  return {
    title: `${post.title} | MyPredictify Blog`,
    description: post.description,
    keywords: post.keywords,
    openGraph: {
      title: `${post.title} | MyPredictify Blog`,
      description: post.description,
      type: 'article',
      publishedTime: post.publishedAt,
      authors: ['MyPredictify'],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    author: { '@type': 'Organization', name: 'MyPredictify', url: siteConfig.url },
    publisher: { '@type': 'Organization', name: 'MyPredictify', url: siteConfig.url },
    keywords: post.keywords.join(', '),
  };

  return (
    <div className="container py-16 max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Blog
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline">{post.league}</Badge>
          <Badge variant="secondary">GW{post.gameweek}</Badge>
          <Badge variant="secondary">{post.season}</Badge>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">{post.title}</h1>
        <p className="text-muted-foreground mt-2">{post.description}</p>
        <time
          dateTime={post.publishedAt}
          className="text-sm text-muted-foreground mt-3 block"
        >
          Published{' '}
          {new Date(post.publishedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </time>
      </div>

      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
      </article>

      <BlogShare slug={slug} title={post.title} />
    </div>
  );
}
