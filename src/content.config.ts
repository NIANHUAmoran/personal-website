import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { columnSlugs } from './data/columns';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    cover: z.object({
      src: z.string(),
      alt: z.string().min(1),
      caption: z.string().optional(),
    }).optional(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    column: z.enum(columnSlugs as [string, ...string[]]).optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
