import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parseComicUrl, proxyToGoogleAppsScript } from './server/apiHandler.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// In Google Cloud Run / AI Studio, NGINX reverse-proxy listens on PORT=8080 and proxies to 127.0.0.1:3000.
// Express MUST listen strictly on port 3000. Listening on 8080 causes EADDRINUSE crash.
const PORT = 3000;

app.use(express.json());

// API: /api/parse-comic?url=...
app.get('/api/parse-comic', async (req, res) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ success: false, error: 'URL не вказано' });
    }
    const result = await parseComicUrl(targetUrl);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Помилка обробки' });
  }
});

// API: /api/comics/check?series_url=...
app.get('/api/comics/check', (_req, res) => {
  return res.json({ exists: false });
});

// API: /api/sheets-proxy
app.all('/api/sheets-proxy', async (req, res) => {
  try {
    const scriptUrl = (req.query.scriptUrl as string) || req.body?.scriptUrl;
    if (!scriptUrl) {
      return res.status(400).json({ success: false, error: 'scriptUrl не вказано' });
    }
    const result = await proxyToGoogleAppsScript(scriptUrl, req.method, req.body);
    const status = result.error ? (result.status >= 400 ? result.status : 400) : result.status;
    return res.status(status).json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Determine environment:
// When running in dev mode via "npm run dev" or "--dev", use Vite middleware.
// In production or standalone container startup, serve pre-built static files from dist/ if available.
const isDev = process.env.npm_lifecycle_event === 'dev' || process.argv.includes('--dev') || !fs.existsSync(path.join(__dirname, 'dist', 'index.html'));
const hasDist = fs.existsSync(path.join(__dirname, 'dist', 'index.html'));
const isProd = !isDev && hasDist;

if (!isProd) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      hmr: false, // Disable HMR websocket server to prevent port 24678 conflicts
    },
    appType: 'custom',
  });
  app.use(vite.middlewares);
  app.get('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const templatePath = path.resolve(__dirname, 'index.html');
      let template = fs.readFileSync(templatePath, 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
} else {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(500).send('Production build missing. Please run `npm run build` first.');
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер працює на порті ${PORT} (режим: ${isProd ? 'production/static' : 'development/vite'})`);
});
