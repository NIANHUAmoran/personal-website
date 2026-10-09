import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { siteConfig } from './src/config.ts';

function servePublicProjectIndexes() {
  return {
    name: 'serve-public-project-indexes',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (!request.url) return next();

        const [pathname, query] = request.url.split('?');
        const match = /^\/projects\/(.+)\/$/.exec(pathname);
        /* 仅接管 public/ 下仍带静态 index.html 的项目目录；
           已 Astro 化的（如 lineage）交给路由，避免盖住页面组件 */
        if (match) {
          const staticIndex = fileURLToPath(
            new URL(`./public/projects/${match[1]}/index.html`, import.meta.url)
          );
          if (existsSync(staticIndex)) {
            request.url = `${pathname}index.html${query ? `?${query}` : ''}`;
          }
        }

        next();
      });
    },
  };
}

export default defineConfig({
  site: siteConfig.siteUrl,
  output: 'static',
  trailingSlash: 'always',
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [servePublicProjectIndexes()],
    environments: {
      astro: {
        optimizeDeps: {
          include: ['picomatch'],
        },
      },
    },
  },
});
