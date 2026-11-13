import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';
import http from 'http';
import { URL } from 'url';

interface ComicExtractResult {
  success: boolean;
  source_domain: string;
  series_url: string;
  reading_url: string;
  current_page: number | null;
  current_issue: string | null;
  title: string;
  cover_url: string;
  total_issues: number | null;
  fallbackReason?: string;
}

// Extract #page-X from URL hash
export function extractPageFromUrl(urlString: string): number {
  if (!urlString) return 1;
  try {
    const parsed = new URL(urlString);
    if (parsed.hash) {
      const match = parsed.hash.match(/#page-(\d+)/i);
      if (match) {
        const page = parseInt(match[1], 10);
        if (page > 0) return page;
      }
    }
  } catch {
    const match = urlString.match(/#page-(\d+)/i);
    if (match) {
      const page = parseInt(match[1], 10);
      if (page > 0) return page;
    }
  }
  return 1;
}

// Extract current_issue from raw text (e.g. # 1, #1, № 1, #25)
export function extractIssueFromText(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(?:#|№)\s*(\d+(?:\.\d+)?)/i);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

// Clean comic title from web spam, leading words, issue suffixes, and translator notes
export function cleanComicTitle(title: string): string {
  if (!title) return '';
  
  let cleaned = title.trim();

  // 1. Remove leading words like "Читать" or "Read" or "Читати"
  cleaned = cleaned.replace(/^(Читать|Read|Читати)\s+/i, '');

  // 2. Remove translation brackets like "(Перевод KenShin)" or "[Перевод KenShin]" or "(Переклад ...)"
  cleaned = cleaned.replace(/\s*[([][^)\]]*(?:Перевод|переклад|translation|transl|by\s+)[^)\]]*[)\]]/gi, '');

  // 3. Remove common website/promotional suffixes
  cleaned = cleaned.replace(/\s+comics\s+online\s+for\s+free/gi, '');
  cleaned = cleaned.replace(/\s+online\s+for\s+free/gi, '');
  cleaned = cleaned.replace(/\s+comics\s+online/gi, '');
  cleaned = cleaned.replace(/\s+read\s+online/gi, '');
  cleaned = cleaned.replace(/\s+читати\s+онлайн/gi, '');
  cleaned = cleaned.replace(/\s+читать\s+онлайн/gi, '');

  // 4. Remove issue suffixes starting with # or № (supporting spaces and trailing numbers)
  cleaned = cleaned.replace(/(?:\s+|—|–|-)*(?:#|№)\s*\d+(?:\.\d+)?/gi, '');

  // 5. Clean up trailing separators
  cleaned = cleaned.replace(/[\s|—–-]+$/, '');

  // 6. Collapse multiple spaces
  cleaned = cleaned.replace(/\s+/g, ' ');

  return cleaned.trim();
}

interface ExtractedJsonLd {
  issueNumber?: string;
  image?: string;
  seriesUrl?: string;
  seriesName?: string;
}

function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  if (!relativeOrAbsolute) return '';
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}

// Support JSON-LD in <script type="application/ld+json">, including @graph
function parseJsonLd(html: string, baseUrl: string): ExtractedJsonLd {
  const result: ExtractedJsonLd = {};
  const scripts = html.match(/<script\s+[^>]*?type=["']application\/ld\+json["'][^>]*?>([\s\S]*?)<\/script>/gi);
  if (!scripts) return result;

  for (const scriptTag of scripts) {
    const jsonText = scriptTag.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '').trim();
    if (!jsonText) continue;

    try {
      const data = JSON.parse(jsonText);
      const items: any[] = [];

      if (Array.isArray(data)) {
        items.push(...data);
      } else if (data && typeof data === 'object') {
        if (Array.isArray(data['@graph'])) {
          items.push(...data['@graph']);
        } else {
          items.push(data);
        }
      }

      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        const type = String(item['@type'] || '');
        if (type.toLowerCase().includes('comicissue') || type.toLowerCase().includes('visualartwork') || item.issueNumber) {
          if (item.issueNumber !== undefined && item.issueNumber !== null) {
            result.issueNumber = String(item.issueNumber).trim();
          }

          if (item.image) {
            if (typeof item.image === 'string') {
              result.image = item.image.trim();
            } else if (typeof item.image === 'object' && item.image.url) {
              result.image = String(item.image.url).trim();
            } else if (Array.isArray(item.image) && item.image.length > 0) {
              const first = item.image[0];
              if (typeof first === 'string') result.image = first.trim();
              else if (first && first.url) result.image = String(first.url).trim();
            }
          }

          if (item.isPartOf) {
            if (typeof item.isPartOf === 'object') {
              if (item.isPartOf.url && !item.isPartOf.url.includes('/reader/')) {
                result.seriesUrl = String(item.isPartOf.url).trim();
              }
              if (item.isPartOf.name) {
                result.seriesName = String(item.isPartOf.name).trim();
              }
            } else if (typeof item.isPartOf === 'string' && !item.isPartOf.includes('/reader/')) {
              result.seriesUrl = item.isPartOf.trim();
            }
          }
        }
      }
    } catch {
      // Ignore JSON parse errors in individual tags
    }
  }

  if (result.image) {
    result.image = resolveUrl(result.image, baseUrl);
  }
  if (result.seriesUrl) {
    result.seriesUrl = resolveUrl(result.seriesUrl, baseUrl);
  }

  return result;
}

// Fetch webpage with timeout and user-agent with safe diagnostics
async function fetchPageHtml(targetUrl: string, timeoutMs = 7000): Promise<{ html: string; status: number; canonical?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const fetchTarget = targetUrl.split('#')[0];
  try {
    const response = await fetch(fetchTarget, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
        Referer: 'https://com-x.life/',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Dest': 'document',
      },
      redirect: 'follow',
    });

    const html = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length') || '';
    const bodySnippet = html.replace(/\s+/g, ' ').substring(0, 500);

    console.log('[Comic Parser Diagnostics]', {
      rawInputUrl: targetUrl,
      fetchTarget,
      method: 'GET',
      status: response.status,
      statusText: response.statusText,
      finalUrl: response.url,
      redirected: response.redirected,
      contentType,
      contentLength,
      bodySnippetLength: html.length,
      bodySnippet,
    });

    return { html, status: response.status, canonical: response.url };
  } catch (err: any) {
    console.log('[Comic Parser Diagnostics Error]', {
      targetUrl,
      error: err?.message,
    });
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function parseComicUrl(rawUrl: string): Promise<ComicExtractResult> {
  const urlTrimmed = rawUrl.trim();
  let domain = '';
  let pathname = '';

  try {
    const parsed = new URL(urlTrimmed);
    domain = parsed.hostname.replace(/^www\./, '');
    pathname = parsed.pathname;
  } catch {
    domain = 'невідомо';
  }

  const detectedPage = extractPageFromUrl(urlTrimmed);
  let detectedIssue: string | null = null;

  let title = '';
  let cover_url = '';
  let series_url = '';
  let reading_url = urlTrimmed;
  let total_issues: number | null = null;
  let fallbackReason: string | undefined;

  let fetchedHtml = '';
  let fetchStatus = 0;
  let finalBaseUrl = urlTrimmed.split('#')[0];

  try {
    const fetchTarget = urlTrimmed.split('#')[0];
    const { html, status, canonical } = await fetchPageHtml(fetchTarget);
    fetchStatus = status;
    if (canonical) finalBaseUrl = canonical;

    if (html && html.length > 100) {
      const lowerHtml = html.toLowerCase();
      const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);
      const rawTitle = titleTagMatch ? titleTagMatch[1].trim() : '';

      const isGenericErrorOrChallenge =
        status !== 200 ||
        lowerHtml.includes('access denied') ||
        lowerHtml.includes('cloudflare') ||
        lowerHtml.includes('attention required') ||
        lowerHtml.includes('<title>404</title>') ||
        lowerHtml.includes('<title>404 - страница не найдена</title>') ||
        lowerHtml.includes('<title>page not found</title>') ||
        rawTitle.toLowerCase() === '404' ||
        rawTitle.toLowerCase().includes('404 - страница') ||
        rawTitle.toLowerCase().includes('вход') ||
        rawTitle.toLowerCase().includes('login') ||
        lowerHtml.includes('sandev-auth-magic') ||
        lowerHtml.includes('/_c?t=') ||
        lowerHtml.includes('x59629');

      const cleanedT = cleanComicTitle(rawTitle);
      const jsonLdData = parseJsonLd(html, finalBaseUrl);
      const hasOgImage = /<meta\s+[^>]*?(?:property|name)=["'](?:og|twitter):image["'][^>]*?content=["'][^"']+["']/i.test(html);

      const hasUsableMetadata = Boolean(
        (cleanedT && cleanedT.length > 2 && !isGenericErrorOrChallenge) ||
        jsonLdData.issueNumber ||
        jsonLdData.seriesName
      );

      if (!isGenericErrorOrChallenge && (status === 200 || hasUsableMetadata)) {
        fetchedHtml = html;
        if (status !== 200) {
          fallbackReason = `HTTP ${status} (метадані успішно отримано з тіла сторінки)`;
        }
      } else {
        fallbackReason = isGenericErrorOrChallenge
          ? 'Сторінка захищена або вимагає входу. Посилання та сторінку збережено, вкажіть назву та обкладинку вручну.'
          : (status !== 200 ? `HTTP ${status} (сторінка недоступна)` : 'Не вдалося розпізнати сторінку');
      }
    } else {
      fallbackReason = fetchStatus ? `HTTP ${fetchStatus} (сторінка недоступна)` : 'Помилка мережі при завантаженні сторінки';
    }
  } catch (err: any) {
    fallbackReason = err?.message || 'Помилка мережі при завантаженні сторінки';
  }

  if (fetchedHtml) {
    const jsonLdData = parseJsonLd(fetchedHtml, finalBaseUrl);

    // 1. Get comic name & issue from HTML <title>
    const titleTagMatch = fetchedHtml.match(/<title>([^<]+)<\/title>/i);
    const rawTitle = titleTagMatch ? titleTagMatch[1] : '';

    if (rawTitle) {
      // Extract issue from raw title before cleaning
      detectedIssue = extractIssueFromText(rawTitle);
      title = cleanComicTitle(rawTitle);
    }

    if (!detectedIssue && jsonLdData.issueNumber) {
      detectedIssue = jsonLdData.issueNumber;
    }

    if (!title && jsonLdData.seriesName) {
      title = cleanComicTitle(jsonLdData.seriesName);
    }

    // Fallback issue check: try URL only if the format clearly exposes issue number
    if (!detectedIssue) {
      const issueUrlMatch = urlTrimmed.match(/\/issue[-_](\d+(?:\.\d+)?)/i);
      if (issueUrlMatch) {
        detectedIssue = issueUrlMatch[1];
      }
    }

    // 2. Cover image selection in strict priority order:
    // 1) og:image
    const ogImageMatch =
      fetchedHtml.match(/<meta\s+[^>]*?(?:property|name)=["']og:image["'][^>]*?content=["']([^"']+)["']/i) ||
      fetchedHtml.match(/<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["']og:image["']/i);

    if (ogImageMatch && ogImageMatch[1]) {
      cover_url = ogImageMatch[1].trim();
    }

    // 2) twitter:image
    if (!cover_url) {
      const twitterImageMatch =
        fetchedHtml.match(/<meta\s+[^>]*?(?:name|property)=["']twitter:image["'][^>]*?content=["']([^"']+)["']/i) ||
        fetchedHtml.match(/<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?(?:name|property)=["']twitter:image["']/i);
      if (twitterImageMatch && twitterImageMatch[1]) {
        cover_url = twitterImageMatch[1].trim();
      }
    }

    // 3) itemprop="image"
    if (!cover_url) {
      const itempropMatch =
        fetchedHtml.match(/<meta\s+[^>]*?itemprop=["']image["'][^>]*?content=["']([^"']+)["']/i) ||
        fetchedHtml.match(/<meta\s+[^>]*?content=["']([^"']+)["'][^>]*?itemprop=["']image["']/i) ||
        fetchedHtml.match(/<img\s+[^>]*?itemprop=["']image["'][^>]*?src=["']([^"']+)["']/i);
      if (itempropMatch && itempropMatch[1]) {
        cover_url = itempropMatch[1].trim();
      }
    }

    // 4) JSON-LD image
    if (!cover_url && jsonLdData.image) {
      cover_url = jsonLdData.image;
    }

    // 5) window.__FIRST_IMAGE__ from inline script
    if (!cover_url) {
      const firstImageMatch =
        fetchedHtml.match(/window\.__FIRST_IMAGE__\s*=\s*["']([^"']+)["']/i) ||
        fetchedHtml.match(/__FIRST_IMAGE__\s*=\s*["']([^"']+)["']/i);
      if (firstImageMatch && firstImageMatch[1]) {
        cover_url = firstImageMatch[1].trim();
      }
    }

    // 6) <link rel="preload" as="image"> as last resort fallback
    if (!cover_url) {
      const linkPreloadMatch =
        fetchedHtml.match(/<link\s+[^>]*?rel=["']preload["'][^>]*?as=["']image["'][^>]*?href=["']([^"']+)["']/i) ||
        fetchedHtml.match(/<link\s+[^>]*?as=["']image["'][^>]*?rel=["']preload["'][^>]*?href=["']([^"']+)["']/i) ||
        fetchedHtml.match(/<link\s+[^>]*?href=["']([^"']+)["'][^>]*?rel=["']preload["'][^>]*?as=["']image["']/i);
      if (linkPreloadMatch && linkPreloadMatch[1]) {
        cover_url = linkPreloadMatch[1].trim();
      }
    }

    if (cover_url) {
      cover_url = resolveUrl(cover_url, finalBaseUrl);
    }

    // 3. Series URL selection in priority order:
    // 1) JSON-LD isPartOf.url
    if (jsonLdData.seriesUrl && !jsonLdData.seriesUrl.includes('/reader/')) {
      series_url = jsonLdData.seriesUrl;
    }

    // 2) Markup series link (e.g. href="/comic/..." or href="/12469-...html")
    if (!series_url) {
      const seriesLinkMatch =
        fetchedHtml.match(/href=["'](https?:\/\/[^"']+\/(?:comic\/|\d+-[^"']+\.html))["']/i) ||
        fetchedHtml.match(/href=["'](\/(?:comic\/|\d+-[^"']+\.html))["']/i);
      if (seriesLinkMatch && seriesLinkMatch[1]) {
        const sUrl = resolveUrl(seriesLinkMatch[1], finalBaseUrl);
        if (!sUrl.includes('/reader/')) {
          series_url = sUrl;
        }
      }
    }

    // 3) Canonical tag if not a reader link
    if (!series_url) {
      const canonicalMatch = fetchedHtml.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
      if (canonicalMatch && canonicalMatch[1]) {
        const canUrl = resolveUrl(canonicalMatch[1].trim(), finalBaseUrl);
        if (!canUrl.includes('/reader/')) {
          series_url = canUrl;
        }
      }
    }
  } else {
    fallbackReason = fetchStatus ? `HTTP ${fetchStatus} (сторінка недоступна)` : 'Помилка мережі при завантаженні сторінки';
  }

  // Never invent a /comic/{id} URL or copy reading_url as series_url. Keep empty string if no valid series_url found.
  if (series_url.includes('/reader/')) {
    series_url = '';
  }

  if (!title) title = '';
  if (!cover_url) cover_url = '';

  if (!fallbackReason && !title) {
    fallbackReason = 'Не вдалося отримати метадані через захист сайту або мережеву помилку. Будь ласка, вкажіть назву та обкладинку вручну.';
  }

  return {
    success: Boolean(title || cover_url),
    source_domain: domain || 'інше',
    series_url,
    reading_url,
    current_page: detectedPage,
    current_issue: detectedIssue,
    title,
    cover_url,
    total_issues,
    fallbackReason,
  };
}

// Proxy requests to Google Apps Script
export async function proxyToGoogleAppsScript(
  appsScriptUrl: string,
  method: string,
  bodyData?: any
): Promise<{ status: number; data: any; error?: string }> {
  try {
    let cleanUrl = (appsScriptUrl || '').trim();

    try {
      const parsedUrl = new URL(cleanUrl);
      if (
        parsedUrl.protocol !== 'https:' ||
        parsedUrl.hostname !== 'script.google.com' ||
        parsedUrl.username ||
        parsedUrl.password ||
        parsedUrl.port
      ) {
        return {
          status: 400,
          data: null,
          error:
            'Некоректний або небезпечний URL Google Apps Script. Потрібен HTTPS URL з доменною адресою script.google.com без портів та облікових даних.',
        };
      }

      const pathname = parsedUrl.pathname;
      const pathRegex = /^\/macros\/s\/[^/]+\/(exec|dev)$/;
      if (!pathRegex.test(pathname)) {
        if (cleanUrl.includes('docs.google.com/spreadsheets')) {
          return {
            status: 400,
            data: null,
            error:
              'Ви вказали посилання на саму Google Таблицю (docs.google.com), а не на веб-програму Google Apps Script! Google блокує прямий запис у таблицю. Відкрийте в таблиці меню «Розширення» (Extensions) → «Apps Script», вставте наданий код і натисніть «Розгорнути» як Веб-програму з доступом «Усі» (Anyone). Посилання вигляду script.google.com/.../exec вставте сюди.',
          };
        }
        if (cleanUrl.includes('script.google.com/home') || cleanUrl.includes('/edit')) {
          return {
            status: 400,
            data: null,
            error:
              'Ви вказали посилання на редактор коду Apps Script (/edit). Натисніть праворуч вгорі синю кнопку «Розгорнути» (Deploy) → «Нове розгортання» → оберіть тип «Веб-програма» (Web app) → Доступ: «Усі» (Anyone). Скопіюйте отриманий URL (/exec) та вставте сюди.',
          };
        }
        return {
          status: 400,
          data: null,
          error:
            'Некоректний шлях URL Google Apps Script. Має бути у форматі /macros/s/<id>/exec (або /dev).',
        };
      }

      // Continue the existing /dev-to-/exec normalization after validation
      if (pathname.endsWith('/dev')) {
        parsedUrl.pathname = pathname.replace(/\/dev$/, '/exec');
        cleanUrl = parsedUrl.toString();
      }
    } catch {
      return {
        status: 400,
        data: null,
        error: 'Некоректний формат URL.',
      };
    }

    const isPost = method.toUpperCase() === 'POST';
    const fetchOptions: RequestInit = {
      method: isPost ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ComicTracker/1.0',
      },
      redirect: 'follow',
    };

    if (isPost && bodyData) {
      fetchOptions.body = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
    }

    const res = await fetch(cleanUrl, fetchOptions);
    const text = await res.text();

    try {
      const json = JSON.parse(text);
      if (json && json.success === false && json.error) {
        const errStr = String(json.error);
        if (
          errStr.includes('doGet') &&
          (errStr.includes('Не удалось найти функцию') ||
            errStr.includes('Script function not found') ||
            errStr.includes('Не вдалося знайти'))
        ) {
          return {
            status: 400,
            data: json,
            error:
              'У розгорнутій версії веб-програми не знайдено функцію doGet. Це означає, що розгортання вказує на стару версію (до збереження нового коду). Щоб оновити: відкрийте Google Apps Script → «Розгорнути» (Deploy) → «Керування розгортаннями» (Manage deployments) → натисніть іконку олівця «Редагувати» (Edit) → у списку «Версія» (Version) обовʼязково виберіть «Нова версія» (New version) та натисніть «Розгорнути» (Deploy). Налаштування доступу змінювати не потрібно, URL розгортання залишиться тим самим.',
          };
        }
        return {
          status: 400,
          data: json,
          error: json.error,
        };
      }
      return { status: res.status, data: json };
    } catch {
      // Analyze non-JSON HTML/runtime responses from Google

      // 1. Check specifically for stale deployment missing doGet
      const isMissingDoGet =
        text.includes('doGet') &&
        (text.includes('Не удалось найти функцию скрипта') ||
          text.includes('Script function not found') ||
          text.includes('Не вдалося знайти функцію скрипта') ||
          text.includes('не найдена функция') ||
          text.includes('function not found'));

      if (isMissingDoGet) {
        return {
          status: 400,
          data: null,
          error:
            'У розгорнутій версії веб-програми не знайдено функцію doGet. Це означає, що розгортання вказує на стару версію (до збереження нового коду). Щоб оновити: відкрийте Google Apps Script → «Розгорнути» (Deploy) → «Керування розгортаннями» (Manage deployments) → натисніть іконку олівця «Редагувати» (Edit) → у списку «Версія» (Version) обовʼязково виберіть «Нова версія» (New version) та натисніть «Розгорнути» (Deploy). Налаштування доступу змінювати не потрібно, URL розгортання залишиться тим самим.',
        };
      }

      // Check general missing function
      const isMissingAnyFunction =
        text.includes('Не удалось найти функцию скрипта') ||
        text.includes('Script function not found') ||
        text.includes('Не вдалося знайти функцію скрипта');

      if (isMissingAnyFunction) {
        return {
          status: 400,
          data: null,
          error:
            'У розгорнутій версії веб-програми не знайдено необхідну функцію скрипта. Розгортання вказує на стару версію коду. Відкрийте Apps Script → «Розгорнути» (Deploy) → «Керування розгортаннями» (Manage deployments) → натисніть «Редагувати» (Edit) → оберіть «Нова версія» (New version) та натисніть «Розгорнути» (Deploy).',
        };
      }

      if (
        text.includes('accounts.google.com') ||
        text.includes('ServiceLogin') ||
        text.includes('Sign in - Google Accounts')
      ) {
        return {
          status: 403,
          data: null,
          error:
            'Скрипт вимагає авторизації в акаунті Google. Переконайтеся, що під час розгортання (Deploy) у полі «Хто має доступ» (Who has access) обрано «Усі» (Anyone), а не «Лише я».',
        };
      }

      if (text.includes('docs.google.com/spreadsheets')) {
        return {
          status: 400,
          data: null,
          error:
            'Отримано сторінку Google Таблиці замість JSON. Вкажіть посилання на веб-програму Apps Script (/exec).',
        };
      }

      const scriptErrMatch =
        text.match(/<div class="errorMessage">([^<]+)<\/div>/i) ||
        text.match(/<div id="errorMessage">([^<]+)<\/div>/i) ||
        text.match(/Exception:\s*([^<]+)/i) ||
        text.match(/Script function not found:\s*([^<]+)/i);

      if (scriptErrMatch) {
        return {
          status: 500,
          data: null,
          error: `Помилка виконання Google Apps Script: ${scriptErrMatch[1].trim()}. Перевірте збереження скрипта та дозволи.`,
        };
      }

      const titleMatch = text.match(/<title>([^<]+)<\/title>/i);
      const pageTitle = titleMatch ? titleMatch[1].trim() : '';

      return {
        status: 400,
        data: null,
        error: pageTitle
          ? `Google повернув веб-сторінку замість JSON: «${pageTitle}». Перевірте права розгортання (Who has access: Anyone).`
          : 'Отримано некоректну відповідь від Google Apps Script (очікувався JSON). Переконайтеся, що веб-програму розгорнуто з доступом «Усі» (Anyone).',
      };
    }
  } catch (err: any) {
    return {
      status: 500,
      data: null,
      error: err?.message || 'Не вдалося звʼязатися з Google Apps Script через мережу',
    };
  }
}
