// Generic & Site-specific adapters for Comic Tracker Extension

const ALLOWED_ORIGINS = [
  'https://comic-tracker.allonsy.agency'
];


function extractIssueFromText(text) {
  if (!text) return null;
  const match = text.match(/(?:#|№)\s*(\d+(?:\.\d+)?)/i);
  return match && match[1] ? match[1] : null;
}

function cleanComicTitle(title) {
  if (!title) return '';
  let cleaned = title.trim();
  cleaned = cleaned.replace(/^(Читать|Read|Читати)\s+/i, '');
  cleaned = cleaned.replace(/\s*[([][^)\]]*(?:Перевод|переклад|translation|transl|by\s+)[^)\]]*[)\]]/gi, '');
  cleaned = cleaned.replace(/\s+comics\s+online\s+for\s+free/gi, '');
  cleaned = cleaned.replace(/\s+online\s+for\s+free/gi, '');
  cleaned = cleaned.replace(/\s+comics\s+online/gi, '');
  cleaned = cleaned.replace(/\s+read\s+online/gi, '');
  cleaned = cleaned.replace(/\s+читати\s+онлайн/gi, '');
  cleaned = cleaned.replace(/\s+читать\s+онлайн/gi, '');
  cleaned = cleaned.replace(/(?:\s+|—|–|-)*(?:#|№)\s*\d+(?:\.\d+)?/gi, '');
  cleaned = cleaned.replace(/[\s|—–-]+$/, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned.trim();
}

function extractPageFromUrl(urlString) {
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
  } catch {}
  const match = urlString.match(/#page-(\d+)/i);
  if (match) {
    const page = parseInt(match[1], 10);
    if (page > 0) return page;
  }
  return 1;
}

function resolveUrl(relativeOrAbsolute, baseUrl) {
  if (!relativeOrAbsolute) return '';
  try {
    const resolved = new URL(relativeOrAbsolute, baseUrl).toString();
    return /^https?:\/\//i.test(resolved) ? resolved : '';
  } catch {
    return /^https?:\/\//i.test(relativeOrAbsolute) ? relativeOrAbsolute : '';
  }
}

// Adapter Base
class BaseAdapter {
  constructor(id, version) {
    this.id = id;
    this.version = version;
  }
  
  normalize(result, fieldSources, warnings = []) {
    return {
      adapterId: this.id,
      adapterVersion: this.version,
      confidence: result.title && result.series_url ? 'high' : (result.title ? 'medium' : 'low'),
      ...result,
      fieldSources,
      warnings,
    };
  }
}

// Concrete Adapters
const Adapters = [
  new class extends BaseAdapter {
    constructor() { super('comx', '1.0.0'); }
    matches(url) { return url.includes('com-x.life'); }
    extract(doc, url) {
      const fieldSources = { title: 'meta', cover_url: 'meta', series_url: 'ld-json', current_issue: 'title', current_page: 'url' };
      const warnings = [];

      let rawTitle = doc.querySelector('title')?.textContent || doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      let title = cleanComicTitle(rawTitle);
      if (!title) warnings.push('reader_title_missing');
      
      let current_issue = extractIssueFromText(rawTitle);
      let current_page = extractPageFromUrl(url);

      let cover_url = '';
      const ogImage = doc.querySelector('meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"]');
      if (ogImage) cover_url = ogImage.getAttribute('content') || '';
      
      if (!cover_url) {
        fieldSources.cover_url = 'script';
        const scripts = doc.querySelectorAll('script');
        for (const s of scripts) {
          const txt = s.textContent || '';
          const m = txt.match(/window\.__FIRST_IMAGE__\s*=\s*["']([^"']+)["']/i);
          if (m && m[1]) { cover_url = m[1]; break; }
        }
      }
      if (!cover_url) {
        fieldSources.cover_url = 'link[rel=preload]';
        const preload = doc.querySelector('link[rel="preload"][as="image"]');
        if (preload) cover_url = preload.getAttribute('href') || '';
      }
      if (!cover_url) warnings.push('cover_missing');
      
      cover_url = resolveUrl(cover_url, url);

      let series_url = '';
      const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
      for (const s of jsonLdScripts) {
        try {
          const data = JSON.parse(s.textContent || '{}');
          const items = Array.isArray(data) ? data : (data['@graph'] || [data]);
          for (const item of items) {
            if (item.isPartOf) {
              const p = item.isPartOf;
              const su = typeof p === 'object' ? p.url : p;
              if (su && typeof su === 'string' && !su.includes('/reader/')) series_url = resolveUrl(su, url);
            }
          }
        } catch {}
      }
      if (!series_url) {
        fieldSources.series_url = 'dom-link';
        const link = doc.querySelector('a[href*="/comic/"], a[href*="-"]');
        if (link && !link.getAttribute('href').includes('/reader/')) series_url = resolveUrl(link.getAttribute('href'), url);
      }
      if (!series_url) warnings.push('series_link_missing');

      return this.normalize({ reading_url: url, title, series_url, cover_url, current_issue, current_page }, fieldSources, warnings);
    }
  }(),

  new class extends BaseAdapter {
    constructor() { super('batcave', '1.0.1'); }
    matches(url) { return url.includes('batcave.biz'); }
    extract(doc, url) {
      const fieldSources = { title: 'title', cover_url: 'reader-image', series_url: 'canonical', current_issue: 'title', current_page: 'url' };
      const warnings = [];

      let rawTitle = doc.title || '';
      let title = cleanComicTitle(rawTitle);
      let current_issue = extractIssueFromText(rawTitle);
      let current_page = extractPageFromUrl(url);

      let cover_url = resolveUrl(
        doc.querySelector('meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"]')?.getAttribute('content') ||
        doc.querySelector('img[alt^="Page:"][src], img[src*="img.batcave.biz"]')?.getAttribute('src') ||
        doc.querySelector('link[rel="preload"][as="image"]')?.getAttribute('href') ||
        '',
        url
      );
      if (!cover_url) warnings.push('cover_missing');
      
      let series_url = resolveUrl(doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '', url);
      if (!series_url || series_url.includes('/reader/')) { series_url = ''; warnings.push('series_link_missing'); }

      return this.normalize({ reading_url: url, title, series_url, cover_url, current_issue, current_page }, fieldSources, warnings);
    }
  }(),

  new class extends BaseAdapter {
    constructor() { super('generic', '1.0.0'); }
    matches() { return true; }
    extract(doc, url) {
      const fieldSources = { title: 'meta', cover_url: 'meta', series_url: 'canonical', current_issue: 'title', current_page: 'url' };
      const warnings = ['generic_adapter_limited'];

      let rawTitle = doc.title || doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      let title = cleanComicTitle(rawTitle);
      let current_issue = extractIssueFromText(rawTitle);
      let current_page = extractPageFromUrl(url);

      let cover_url = resolveUrl(doc.querySelector('meta[property="og:image"], meta[name="twitter:image"], meta[itemprop="image"]')?.getAttribute('content') || '', url);
      let series_url = resolveUrl(doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || '', url);

      return this.normalize({ reading_url: url, title, series_url: series_url.includes('/reader/') ? '' : series_url, cover_url, current_issue, current_page }, fieldSources, warnings);
    }
  }()
];

function extractComicMetadata(doc, url) {
  const adapter = Adapters.find(a => a.matches(url)) || Adapters.find(a => a.id === 'generic');
  return adapter.extract(doc, url);
}

// Run on page load and respond to background/popup
const isAppOrigin = ALLOWED_ORIGINS.includes(window.location.origin);
const metadata = isAppOrigin ? null : extractComicMetadata(document, window.location.href);

// If we are on a supported comic site, cache the metadata for the app to pull
if (metadata && metadata.confidence !== 'low') {
  chrome.storage.local.set({ lastExtractedMetadata: metadata });
}

chrome.runtime.onMessage?.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractMetadata') {
    sendResponse(metadata);
  }
  if (request.action === 'triggerAutoSync' && isAppOrigin) {
    window.postMessage({ 
      type: 'EXTENSION_METADATA', 
      metadata: request.metadata,
      isAutoSync: true 
    }, window.location.origin);
  }
});

// Listener for extension-aware web app integration

window.addEventListener('message', (event) => {
  if (!ALLOWED_ORIGINS.includes(event.origin)) return;
  
  if (event.data?.type === 'CHECK_EXTENSION') {
    const isAppOrigin = ALLOWED_ORIGINS.includes(window.location.origin);
    
    if (isAppOrigin) {
      // On the app page, we pull the LAST KNOWN comic metadata from storage
      chrome.storage.local.get(['lastExtractedMetadata'], (result) => {
        if (result.lastExtractedMetadata) {
          window.postMessage({
            type: 'EXTENSION_METADATA',
            metadata: result.lastExtractedMetadata
          }, event.origin);
        }
      });
    } else {
      // On a comic page, we send the LOCAL metadata
      window.postMessage({ type: 'EXTENSION_METADATA', metadata: metadata }, event.origin);
    }
  }
});

// Auto-sync navigation monitoring
let lastUrl = window.location.href;
let syncTimeout = null;

function monitorNavigation() {
  if (isAppOrigin) return; // Never auto-sync from the app's own tab
  const currentUrl = window.location.href;
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    handleUrlChange();
  }
  requestAnimationFrame(monitorNavigation);
}

let lastSyncedState = null;

function handleUrlChange() {
  if (syncTimeout) clearTimeout(syncTimeout);
  
  // Debounce 3 seconds to ensure page content/metadata is stable
  syncTimeout = setTimeout(() => {
    // Only sync if this tab is currently active and visible
    if (document.visibilityState !== 'visible') return;

    const freshMetadata = extractComicMetadata(document, window.location.href);
    
    // Skip if it's a generic/low confidence adapter
    if (freshMetadata.confidence === 'low') return;

    // Skip if state is duplicate of last synced state
    const currentState = `${freshMetadata.reading_url}-${freshMetadata.current_issue || ''}-${freshMetadata.current_page || 1}`;
    if (currentState === lastSyncedState) return;

    // Stricter URL validation before sending
    const validateUrl = (url) => url && /^https?:\/\//i.test(url) && !url.startsWith('data:');
    if (!validateUrl(freshMetadata.reading_url)) return;
    if (freshMetadata.cover_url && !validateUrl(freshMetadata.cover_url)) freshMetadata.cover_url = '';
    if (freshMetadata.series_url && !validateUrl(freshMetadata.series_url)) freshMetadata.series_url = '';

    chrome.storage.local.get(['autoSync'], (result) => {
      if (result.autoSync) {
        lastSyncedState = currentState;
        chrome.runtime.sendMessage({ 
          action: 'autoSyncUpdate', 
          metadata: freshMetadata 
        });
      }
    });
  }, 3000);
}

// Start monitoring
monitorNavigation();

// Also listen for explicit navigation events
window.addEventListener('popstate', handleUrlChange);
window.addEventListener('hashchange', handleUrlChange);

// Monkeypatch history API to detect SPA navigation
(function(history){
    const pushState = history.pushState;
    history.pushState = function(state) {
        if (typeof history.onpushstate == "function") {
            history.onpushstate({state: state});
        }
        const ret = pushState.apply(history, arguments);
        handleUrlChange();
        return ret;
    };
    const replaceState = history.replaceState;
    history.replaceState = function(state) {
        if (typeof history.onreplacestate == "function") {
            history.onreplacestate({state: state});
        }
        const ret = replaceState.apply(history, arguments);
        handleUrlChange();
        return ret;
    };
})(window.history);
