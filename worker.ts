import { parseComicUrl } from './server/apiHandler.ts';

const ALLOWED_ORIGINS = [
  'https://nickohorodnik.github.io',
  'https://comic-tracker.allonsy.agency',
];

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // /health endpoint
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      });
    }

    // /api/parse-comic
    if (url.pathname === '/api/parse-comic') {
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        return new Response(JSON.stringify({ success: false, error: 'URL не вказано' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      try {
        const parsedTarget = new URL(targetUrl);
        if (parsedTarget.protocol !== 'http:' && parsedTarget.protocol !== 'https:') {
          return new Response(JSON.stringify({ success: false, error: 'Некоректний протокол URL' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        // 15-second upstream timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
          const result = await parseComicUrl(targetUrl);
          clearTimeout(timeoutId);
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          throw fetchErr;
        }
      } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err?.message || 'Помилка обробки' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    // /api/sheets-proxy
    if (url.pathname === '/api/sheets-proxy') {
      try {
        let bodyData: any = null;
        if (request.method === 'POST') {
          try {
            bodyData = await request.json();
          } catch {
            bodyData = null;
          }
        }

        const scriptUrl = url.searchParams.get('scriptUrl') || (bodyData && bodyData.scriptUrl);
        if (!scriptUrl) {
          return new Response(JSON.stringify({ success: false, error: 'scriptUrl не вказано' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        // Strict Apps Script URL validation
        let cleanUrl = String(scriptUrl).trim();
        try {
          const parsedScriptUrl = new URL(cleanUrl);
          if (
            parsedScriptUrl.protocol !== 'https:' ||
            parsedScriptUrl.hostname !== 'script.google.com' ||
            parsedScriptUrl.username ||
            parsedScriptUrl.password ||
            parsedScriptUrl.port
          ) {
            return new Response(
              JSON.stringify({
                status: 400,
                data: null,
                error: 'Некоректний або небезпечний URL Google Apps Script. Потрібен HTTPS URL з доменною адресою script.google.com без портів та облікових даних.',
              }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }

          const pathname = parsedScriptUrl.pathname;
          const pathRegex = /^\/macros\/s\/[^/]+\/(exec|dev)$/;
          if (!pathRegex.test(pathname)) {
            return new Response(
              JSON.stringify({
                status: 400,
                data: null,
                error: 'Некоректний шлях URL Google Apps Script. Має бути у форматі /macros/s/<id>/exec (або /dev).',
              }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }

          if (pathname.endsWith('/dev')) {
            parsedScriptUrl.pathname = pathname.replace(/\/dev$/, '/exec');
            cleanUrl = parsedScriptUrl.toString();
          }
        } catch {
          return new Response(
            JSON.stringify({
              status: 400,
              data: null,
              error: 'Некоректний формат URL.',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        // 15-second upstream timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const isPost = request.method.toUpperCase() === 'POST';
        const fetchOptions: RequestInit = {
          method: isPost ? 'POST' : 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain, */*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ComicTracker/1.0',
          },
          signal: controller.signal,
          redirect: 'follow',
        };

        if (isPost && bodyData) {
          fetchOptions.body = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
        }

        const res = await fetch(cleanUrl, fetchOptions);
        clearTimeout(timeoutId);
        const text = await res.text();

        try {
          const jsonResult = JSON.parse(text);
          if (jsonResult && jsonResult.success === false && jsonResult.error) {
            return new Response(
              JSON.stringify({ status: 400, data: jsonResult, error: jsonResult.error }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }
          return new Response(
            JSON.stringify({ status: res.status, data: jsonResult }),
            { status: res.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        } catch {
          return new Response(
            JSON.stringify({
              status: 400,
              data: null,
              error: 'Отримано некоректну відповідь від Google Apps Script (очікувався JSON).',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
      } catch (err: any) {
        return new Response(
          JSON.stringify({
            status: 500,
            data: null,
            error: err?.message || 'Не вдалося звʼязатися з Google Apps Script через мережу',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
