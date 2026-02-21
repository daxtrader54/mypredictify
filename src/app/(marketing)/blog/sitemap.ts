import { getAllPosts } from '@/lib/blog';
import { siteConfig } from '@/config/site';

export default async function sitemap() {
  const { posts } = await getAllPosts({ perPage: 1000 });

  return posts.map((post) => ({
    url: `${siteConfig.url}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));
}
