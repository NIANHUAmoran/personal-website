import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { siteConfig } from '../config';
import { getPublishedPosts } from '../lib/content';

export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts();

  return rss({
    title: siteConfig.siteName,
    description: siteConfig.siteDescription,
    site: context.site ?? siteConfig.siteUrl,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
      categories: post.data.tags,
    })),
    customData: '<language>zh-CN</language>',
  });
};
