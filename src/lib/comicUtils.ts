import { Comic } from '../types/comic.ts';

// Extract current_issue from page title (e.g. #1, # 1, #25)
export function extractIssueFromText(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(?:#|№)\s*(\d+(?:\.\d+)?)/i);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

// Clean comic title from web spam, leading words, suffixes, and translators
export function cleanComicTitle(title: string): string {
  if (!title) return '';
  
  let cleaned = title.trim();

  // 1. Remove leading words like "Читать" or "Read" or "Читати"
  cleaned = cleaned.replace(/^(Читать|Read|Читати)\s+/i, '');

  // 2. Remove translation brackets like "(Перевод KenShin)" or "[Перевод KenShin]" or "(Переклад ...)"
  cleaned = cleaned.replace(/\s*[([][^)\]]*(?:Перевод|переклад|translation|transl|by\s+)[^)\]]*[)\]]/gi, '');

  // 3. Remove common website suffixes
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

export function normalizeUrl(urlStr: string): string {
  if (!urlStr) return '';
  try {
    const u = new URL(urlStr.trim());
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    let pathname = u.pathname.replace(/\/+$/, '');
    return `${host}${pathname}`;
  } catch {
    return urlStr.trim().toLowerCase().replace(/\/+$/, '');
  }
}

export function checkDuplicateComic(
  newSeriesUrl: string,
  newReadingUrl: string,
  comics: Comic[],
  currentComicId?: string
): Comic | null {
  const normSeries = normalizeUrl(newSeriesUrl);
  const normReading = normalizeUrl(newReadingUrl);

  for (const c of comics) {
    if (currentComicId && c.id === currentComicId) continue;
    const cSeries = normalizeUrl(c.series_url);
    const cReading = normalizeUrl(c.reading_url);

    if (
      (normSeries && (normSeries === cSeries || normSeries === cReading)) ||
      (normReading && (normReading === cSeries || normReading === cReading))
    ) {
      return c;
    }
  }
  return null;
}

export function findMatchingComic(
  metadata: { title: string; seriesUrl?: string; readingUrl?: string },
  comics: Comic[]
): Comic | null {
  const normSeries = metadata.seriesUrl ? normalizeUrl(metadata.seriesUrl) : '';
  const normReading = metadata.readingUrl ? normalizeUrl(metadata.readingUrl.split('#')[0]) : '';
  const cleanMetaTitle = cleanComicTitle(metadata.title || '').toLowerCase();

  // Priority 1: normalized verified seriesUrl
  if (normSeries) {
    const match = comics.find((c) => c.series_url && normalizeUrl(c.series_url) === normSeries);
    if (match) return match;
  }

  // Priority 2: normalized reading resource URL without #page-N
  if (normReading) {
    const match = comics.find((c) => {
      const cReadingBase = c.reading_url ? normalizeUrl(c.reading_url.split('#')[0]) : '';
      const cSeries = c.series_url ? normalizeUrl(c.series_url) : '';
      return (cReadingBase && cReadingBase === normReading) || (cSeries && cSeries === normReading);
    });
    if (match) return match;
  }

  // Priority 4: title only as weak fallback, ONLY if uniquely matched
  if (cleanMetaTitle && cleanMetaTitle.length > 2) {
    const matchingByTitle = comics.filter(
      (c) => cleanComicTitle(c.title).toLowerCase() === cleanMetaTitle
    );
    if (matchingByTitle.length === 1) {
      return matchingByTitle[0];
    }
  }

  return null;
}


export function getPriorityBadgeColor(priority: string): { bg: string; text: string; border: string } {
  if (priority.includes('1') || priority.toLowerCase().includes("обов'язково")) {
    return { bg: 'bg-rose-500/50', text: 'text-white font-medium', border: 'border-rose-400/50' };
  }
  if (priority.includes('2') || priority.toLowerCase().includes('високий')) {
    return { bg: 'bg-amber-500/50', text: 'text-white font-medium', border: 'border-amber-400/50' };
  }
  if (priority.includes('3') || priority.toLowerCase().includes('звичайний')) {
    return { bg: 'bg-sky-500/50', text: 'text-white font-medium', border: 'border-sky-400/50' };
  }
  if (priority.includes('4') || priority.toLowerCase().includes('низький')) {
    return { bg: 'bg-slate-600/50', text: 'text-white font-medium', border: 'border-slate-400/50' };
  }
  // 5 Колись
  return { bg: 'bg-purple-500/50', text: 'text-white font-medium', border: 'border-purple-400/50' };
}

export function getStatusBadgeColor(status: string): { bg: string; text: string; border: string; dot: string } {
  switch (status) {
    case 'Читаю':
      return { bg: 'bg-emerald-600/50', text: 'text-white font-semibold', border: 'border-emerald-400/50', dot: 'bg-emerald-300' };
    case 'Хочу прочитати':
      return { bg: 'bg-indigo-600/50', text: 'text-white font-semibold', border: 'border-indigo-400/50', dot: 'bg-indigo-300' };
    case 'Прочитано':
      return { bg: 'bg-teal-600/50', text: 'text-white font-semibold', border: 'border-teal-400/50', dot: 'bg-teal-300' };
    case 'Відкладено':
      return { bg: 'bg-amber-600/50', text: 'text-white font-semibold', border: 'border-amber-400/50', dot: 'bg-amber-300' };
    case 'Кинуто':
      return { bg: 'bg-zinc-700/60', text: 'text-zinc-100 font-semibold', border: 'border-zinc-500/50', dot: 'bg-zinc-400' };
    default:
      return { bg: 'bg-zinc-700/50', text: 'text-white font-semibold', border: 'border-zinc-500/50', dot: 'bg-zinc-300' };
  }
}

export function formatProgressInfo(comic: Comic): {
  displayText: string;
  percentage: number | null;
  hasTotal: boolean;
} {
  const current = comic.current_issue ? parseFloat(comic.current_issue) : null;
  const total = comic.total_issues;

  if (total && total > 0 && current !== null && !isNaN(current)) {
    const rawPct = (current / total) * 100;
    const clampedPct = Math.min(100, Math.max(0, Math.round(rawPct)));
    const pageExtra = comic.current_page ? `, стор. ${comic.current_page}` : '';
    return {
      displayText: `Прочитано ${comic.current_issue} із ${total}${pageExtra}`,
      percentage: clampedPct,
      hasTotal: true,
    };
  }

  // Unknown total issues: never invent percentage
  let text = '';
  if (comic.current_issue) {
    text = `Випуск ${comic.current_issue}`;
    if (comic.current_page) {
      text += `, стор. ${comic.current_page}`;
    }
  } else if (comic.current_page) {
    text = `Сторінка ${comic.current_page}`;
  } else {
    text = 'Не розпочато';
  }

  return {
    displayText: text,
    percentage: null,
    hasTotal: false,
  };
}

export function formatDateUk(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
