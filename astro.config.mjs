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
        if (/^\/projects\/.+\/$/.test(pathname)) {
          request.url = `${pathname}index.html${query ? `?${query}` : ''}`;
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
