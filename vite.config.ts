import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { parseComicUrl, proxyToGoogleAppsScript } from './server/apiHandler.ts';

function apiPlugin(): Plugin {
  return {
    name: 'comic-tracker-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';

        // API: /api/parse-comic?url=...
        if (url.startsWith('/api/parse-comic')) {
          try {
            const parsedUrl = new URL(url, 'http://localhost:3000');
            const targetUrl = parsedUrl.searchParams.get('url');

            if (!targetUrl) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'URL не вказано' }));
              return;
            }

            const result = await parseComicUrl(targetUrl);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err?.message || 'Помилка обробки' }));
          }
          return;
        }

        // API: /api/sheets-proxy
        if (url.startsWith('/api/sheets-proxy')) {
          try {
            let bodyData = null;
            if (req.method === 'POST') {
              bodyData = await new Promise((resolve) => {
                let data = '';
                req.on('data', (chunk: any) => {
                  data += chunk;
                });
                req.on('end', () => {
                  try {
                    resolve(JSON.parse(data));
                  } catch {
                    resolve(data);
                  }
                });
              });
            }

            const parsedUrl = new URL(url, 'http://localhost:3000');
            const scriptUrl = parsedUrl.searchParams.get('scriptUrl') || (bodyData && (bodyData as any).scriptUrl);

            if (!scriptUrl) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'scriptUrl не вказано' }));
              return;
            }

            const result = await proxyToGoogleAppsScript(scriptUrl, req.method || 'GET', bodyData);
            res.statusCode = result.error ? (result.status >= 400 ? result.status : 400) : result.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err?.message }));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    // The site is served from the domain root on both GitHub Pages and its custom domain.
    base: '/',
    plugins: [react(), tailwindcss(), apiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
