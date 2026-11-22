import React, { useState, useEffect } from 'react';
import {
  X,
  Link,
  Loader2,
  AlertCircle,
  Plus,
  BookOpen,
  Check,
  ExternalLink,
  RefreshCw,
  Copy,
  Globe,
} from 'lucide-react';
import {
  Comic,
  PublisherItem,
  PriorityItem,
  StatusItem,
  TagItem,
} from '../types/comic.ts';
import { ComicCover } from './ComicCover.tsx';
import { checkDuplicateComic, extractPageFromUrl, cleanComicTitle, extractIssueFromText } from '../lib/comicUtils.ts';
import { makeCoverDataUrl } from '../lib/coverImage.ts';

interface AddComicModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (comic: Comic, customPublisher?: string, newTags?: string[]) => Promise<void>;
  onOpenExisting: (comic: Comic) => void;
  onUpdateExisting: (comic: Comic) => void;
  existingComics: Comic[];
  publishers: PublisherItem[];
  priorities: PriorityItem[];
  statuses: StatusItem[];
  availableTags: TagItem[];
  extensionStatus: 'connected' | 'not_detected' | 'unknown';
  onOpenIntegration: () => void;
  importMetadata?: any;
}

export const AddComicModal: React.FC<AddComicModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onOpenExisting,
  onUpdateExisting,
  existingComics,
  publishers,
  priorities,
  statuses,
  availableTags,
  extensionStatus,
  onOpenIntegration,
  importMetadata,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [seriesUrl, setSeriesUrl] = useState('');
  const [readingUrl, setReadingUrl] = useState('');
  const [currentIssue, setCurrentIssue] = useState('');
  const [currentPage, setCurrentPage] = useState<string>('');
  const [totalIssues, setTotalIssues] = useState<string>('');
  const [publisher, setPublisher] = useState('Marvel Comics');
  const [customPublisher, setCustomPublisher] = useState('');
  const [priority, setPriority] = useState('3 Звичайний');
  const [status, setStatus] = useState('Хочу прочитати');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [note, setNote] = useState('');
  const [sourceDomain, setSourceDomain] = useState('');

  // Duplicate state
  const [duplicateComic, setDuplicateComic] = useState<Comic | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleCoverFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setCoverUploadError(null);
    try {
      setCoverUrl(await makeCoverDataUrl(file));
    } catch (error) {
      setCoverUploadError(error instanceof Error ? error.message : 'Не вдалося завантажити обкладинку.');
    }
  };
  const handleCoverPaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const file = Array.from(event.clipboardData.items)
      .find((item) => item.type.startsWith('image/'))
      ?.getAsFile() || event.clipboardData.files[0];
    if (!file) return;

    event.preventDefault();
    setCoverUploadError(null);
    try {
      setCoverUrl(await makeCoverDataUrl(file));
    } catch (error) {
      setCoverUploadError(error instanceof Error ? error.message : 'Не вдалося вставити обкладинку.');
    }
  };

  // Handle URL analyze
  const handleAnalyzeUrl = async (urlToTest?: string) => {
    const targetUrl = (urlToTest || urlInput).trim();
    if (!targetUrl) return;

    setIsLoadingMetadata(true);
    setMetadataError(null);
    setDuplicateComic(null);

    let localDomain = '';
    let localReadingUrl = targetUrl;
    let localSeriesUrl = '';
    let localTitle = title;
    let localCoverUrl = coverUrl;
    let localCurrentIssue = currentIssue;
    let localCurrentPage = String(extractPageFromUrl(targetUrl));
    let localTotalIssues = totalIssues;
    let fallbackReason: string | null = null;

    try {
      const res = await fetch(`/api/parse-comic?url=${encodeURIComponent(targetUrl)}`);
      const parsedData = await res.json();

      if (parsedData) {
        if (parsedData.source_domain) localDomain = parsedData.source_domain;
        if (parsedData.reading_url) {
          localReadingUrl = parsedData.reading_url;
        }
        if (parsedData.series_url && !parsedData.series_url.includes('/reader/')) {
          localSeriesUrl = parsedData.series_url;
        }
        if (parsedData.title && parsedData.title.trim()) {
          localTitle = parsedData.title.trim();
        }
        if (parsedData.cover_url && parsedData.cover_url.trim()) {
          localCoverUrl = parsedData.cover_url.trim();
        }
        if (parsedData.current_issue) {
          localCurrentIssue = parsedData.current_issue;
        }
        if (parsedData.current_page !== null && parsedData.current_page !== undefined) {
          localCurrentPage = String(parsedData.current_page);
        } else {
          localCurrentPage = String(extractPageFromUrl(targetUrl));
        }
        if (parsedData.total_issues !== null && parsedData.total_issues !== undefined) {
          localTotalIssues = String(parsedData.total_issues);
        }
        fallbackReason = parsedData.fallbackReason || null;
      }
    } catch (err: any) {
      fallbackReason = err?.message || 'Помилка мережі';
    }

    // Apply state setters ONCE with final calculated local values
    setSourceDomain(localDomain);
    setReadingUrl(localReadingUrl);
    setSeriesUrl(localSeriesUrl);
    if (localTitle) setTitle(localTitle);
    if (localCoverUrl) setCoverUrl(localCoverUrl);
    if (localCurrentIssue) setCurrentIssue(localCurrentIssue);
    setCurrentPage(localCurrentPage);
    if (localTotalIssues) setTotalIssues(localTotalIssues);

    let infoMessage: string | null = null;
    if (!localTitle || !localCoverUrl) {
      infoMessage = 'Не вдалося автоматично отримати метадані. Посилання та прогрес збережено — назву й обкладинку можна вказати вручну.';
    }
    setMetadataError(infoMessage);

    // Duplicate detection using finalized URLs
    const dup = checkDuplicateComic(localSeriesUrl, localReadingUrl, existingComics);
    if (dup) {
      setDuplicateComic(dup);
    }

    setIsLoadingMetadata(false);
  };

  // When reading_url changes, auto extract #page-X
  const handleReadingUrlChange = (val: string) => {
    setReadingUrl(val);
    const extracted = extractPageFromUrl(val);
    if (extracted !== null) {
      setCurrentPage(String(extracted));
    }
    // duplicate check
    const dup = checkDuplicateComic(seriesUrl, val, existingComics);
    setDuplicateComic(dup);
  };

  const handleSeriesUrlChange = (val: string) => {
    setSeriesUrl(val);
    const dup = checkDuplicateComic(val, readingUrl, existingComics);
    setDuplicateComic(dup);
  };

  // Tag management
  const handleAddTag = (rawTag: string) => {
    const trimmed = rawTag.trim();
    if (!trimmed || tags.length >= 5) return;
    const exists = tags.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Extension metadata listener
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // SECURITY: Validate origin
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'EXTENSION_METADATA') {
        const data = event.data.metadata;
        if (!data || typeof data !== 'object') return;

        const isSafeUrl = (url: any) => typeof url === 'string' && /^https?:\/\//i.test(url) && !url.startsWith('data:');

        // Only update if we have meaningful data
        if (!data.title && !data.reading_url) return;
        
        // If we already have a title manually entered, don't overwrite with something generic
        if (title && data.confidence === 'low') return;

        if (data.title) setTitle(data.title);
        if (isSafeUrl(data.cover_url)) setCoverUrl(data.cover_url);
        if (isSafeUrl(data.series_url)) setSeriesUrl(data.series_url);
        if (isSafeUrl(data.reading_url)) {
          setReadingUrl(data.reading_url);
          // Only update URL input if it was empty or matching previous reading url
          if (!urlInput || urlInput === readingUrl) {
            setUrlInput(data.reading_url);
          }
        }
        if (data.current_issue) setCurrentIssue(data.current_issue);
        if (data.current_page !== undefined) setCurrentPage(String(data.current_page));
        
        setSourceDomain('Comic Tracker Bridge');

        // Check for duplicates
        const dup = checkDuplicateComic(data.series_url || '', data.reading_url || '', existingComics);
        if (dup) setDuplicateComic(dup);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle deep-link / initial metadata prefill
  useEffect(() => {
    if (isOpen && importMetadata) {
      const isSafeUrl = (url: any) => typeof url === 'string' && /^https?:\/\//i.test(url) && !url.startsWith('data:');
      
      if (importMetadata.title) setTitle(importMetadata.title);
      if (isSafeUrl(importMetadata.cover_url)) setCoverUrl(importMetadata.cover_url);
      if (isSafeUrl(importMetadata.series_url)) setSeriesUrl(importMetadata.series_url);
      if (isSafeUrl(importMetadata.reading_url)) {
        setReadingUrl(importMetadata.reading_url);
        setUrlInput(importMetadata.reading_url);
      }
      if (importMetadata.current_issue) setCurrentIssue(importMetadata.current_issue);
      if (importMetadata.current_page) setCurrentPage(String(importMetadata.current_page));
      
      if (importMetadata.reading_url || importMetadata.series_url) {
        setSourceDomain('Comic Tracker Bridge');
      }

      // Check for duplicates immediately if we have enough info
      if (importMetadata.series_url || importMetadata.reading_url) {
        const dup = checkDuplicateComic(
          importMetadata.series_url || '', 
          importMetadata.reading_url || '', 
          existingComics
        );
        if (dup) setDuplicateComic(dup);
      }
    }
  }, [isOpen, importMetadata, existingComics]);

  // Submit
  const handleSubmit = async (e: React.FormEvent, forceAdd = false) => {
    e.preventDefault();
    if (!String(title || '').trim()) {
      setSubmitError('Введіть назву коміксу');
      return;
    }

    if (duplicateComic && !forceAdd) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const selectedPriorityObj = priorities.find((p) => p.name === priority);
      const priorityOrder = selectedPriorityObj ? selectedPriorityObj.sort_order : 3;

      const trimmedCustomPub = String(customPublisher || '').trim();
      const finalPublisher =
        publisher === 'Інше' && trimmedCustomPub
          ? trimmedCustomPub
          : publisher;

      const newComic: Comic = {
        id: `comic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: String(title || '').trim(),
        cover_url: String(coverUrl || '').trim(),
        series_url: String(seriesUrl || '').trim() || String(readingUrl || '').trim(),
        reading_url: String(readingUrl || '').trim() || String(seriesUrl || '').trim(),
        current_issue: String(currentIssue || '').trim(),
        current_page: currentPage ? parseInt(currentPage, 10) : null,
        total_issues: totalIssues ? parseInt(totalIssues, 10) : null,
        publisher: finalPublisher,
        priority: priority,
        priority_order: priorityOrder,
        status: status,
        tags: tags,
        note: String(note || '').trim(),
        source_domain: sourceDomain || 'інше',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        progress_updated_at: new Date().toISOString(),
        last_read_at: null,
      };

      await onSave(
        newComic,
        publisher === 'Інше' && trimmedCustomPub ? trimmedCustomPub : undefined,
        tags
      );
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'Помилка при збереженні коміксу');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Autocomplete tags suggestions
  const tagSuggestions = availableTags
    .filter(
      (at) =>
        !tags.some((t) => t.toLowerCase() === at.name.toLowerCase()) &&
        at.name.toLowerCase().includes(tagInput.toLowerCase())
    )
    .slice(0, 5);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#121420] border border-white/10 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col text-xs text-zinc-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#161826]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Додати комікс до бібліотеки
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)] space-y-5">
          {/* Step 1: URL input */}
          <div className="space-y-1.5">
            <label className="font-semibold text-zinc-200 flex items-center gap-1.5">
              <Link className="w-3.5 h-3.5 text-indigo-400" />
              <span>Посилання на комікс або читалку</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://com-x.life/... або https://batcave.biz/..."
                className="flex-1 bg-[#181a29] border border-white/10 rounded-lg px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => handleAnalyzeUrl()}
                disabled={isLoadingMetadata || !urlInput.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {isLoadingMetadata ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Аналіз...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Розпізнати</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Extension Integration Action */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.postMessage({ type: 'CHECK_EXTENSION' }, '*')}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Імпортувати через розширення</span>
              </button>

              {extensionStatus !== 'connected' && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 space-y-1.5">
                  <p className="text-[10px] text-amber-300 font-medium flex items-center gap-1.5 uppercase tracking-wide">
                    <AlertCircle className="w-3 h-3" />
                    Розширення не підключено
                  </p>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Для миттєвого імпорту встановіть розширення <strong className="text-zinc-400">Comic Tracker Bridge</strong>. Воно вміє читати метадані прямо зі сторінки коміксу.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenIntegration}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
                  >
                    Як встановити розширення?
                  </button>
                </div>
              )}
            </div>
            
            <p className="text-[11px] text-zinc-500 pt-1">
              Підтримуються com-x.life, batcave.biz та будь-які інші сайти. Метадані та сторінка витягуються автоматично.
            </p>
          </div>

          {/* Warning/Error alert if OG failed */}
          {metadataError && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>{metadataError}</span>
            </div>
          )}

          {/* Duplicate Detection Alert */}
          {duplicateComic && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2.5">
              <div className="flex items-start gap-2 text-rose-300 font-semibold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <span>Знайдено схожий комікс у бібліотеці: </span>
                  <span className="text-white">«{duplicateComic.title}»</span>
                  <span className="block text-[11px] font-normal text-zinc-400 mt-0.5">
                    Статус: {duplicateComic.status} • Поточний випуск: {duplicateComic.current_issue || '—'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onOpenExisting(duplicateComic);
                    onClose();
                  }}
                  className="px-2.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Відкрити</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const finalTitle = title.trim() || duplicateComic.title;
                    const finalCover = coverUrl.trim() || duplicateComic.cover_url;
                    const finalIssue = currentIssue.trim() || duplicateComic.current_issue;
                    const finalPage = currentPage ? parseInt(currentPage, 10) : 1;

                    onUpdateExisting({
                      ...duplicateComic,
                      title: finalTitle,
                      cover_url: finalCover,
                      reading_url: readingUrl || duplicateComic.reading_url,
                      current_issue: finalIssue,
                      current_page: finalPage,
                      updated_at: new Date().toISOString(),
                    });
                    onClose();
                  }}
                  className="px-2.5 py-1.5 rounded-md bg-[#23263b] hover:bg-[#2e324e] text-zinc-200 border border-white/10 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3 text-indigo-400" />
                  <span>Оновити існуючий</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] cursor-pointer"
                >
                  <span>Все одно додати</span>
                </button>
              </div>
            </div>
          )}

          {/* Preview Box & Live edit fields */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#161826] border border-white/5 rounded-xl p-4">
            <div className="sm:col-span-1 flex flex-col items-center">
              <span className="text-[11px] text-zinc-400 mb-1.5 font-medium">Обкладинка</span>
              <div className="w-24 h-36 shadow-lg rounded overflow-hidden">
                <ComicCover src={coverUrl} alt={title || 'Попередній перегляд'} className="w-full h-full" />
              </div>
            </div>

            <div className="sm:col-span-3 space-y-3">
              {/* Title */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Назва коміксу *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="напр. Бетмен: Довгий Геловін"
                  className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Cover URL */}
              <div onPaste={handleCoverPaste}>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  URL обкладинки
                </label>
                <input
                  type="text"
                  inputMode="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://.../cover.jpg"
                  className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                />
                <p className="mt-1 text-[10px] text-zinc-500">
                  Скопіюйте зображення на Batcave та натисніть Ctrl+V у полі обкладинки.
                </p>
                <label className="block text-[11px] font-semibold text-zinc-300 mt-2 mb-1">
                  Або виберіть файл обкладинки
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFile}
                  className="w-full text-[11px] text-zinc-400 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-200 hover:file:bg-zinc-700"
                />
                <p className="mt-1 text-[10px] text-zinc-500">Файл буде зменшено для збереження разом із коміксом.</p>
                {coverUploadError && <p className="mt-1 text-[10px] text-rose-400">{coverUploadError}</p>}
              </div>
            </div>
          </div>

          {/* URLs: Series URL vs Reading URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Постійне посилання на серію (Series URL)
              </label>
              <input
                type="url"
                value={seriesUrl}
                onChange={(e) => handleSeriesUrlChange(e.target.value)}
                placeholder="https://com-x.life/comic/..."
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Посилання на поточне місце (Reading URL)
              </label>
              <input
                type="url"
                value={readingUrl}
                onChange={(e) => handleReadingUrlChange(e.target.value)}
                placeholder="https://com-x.life/reader/29774/995703#page-2"
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Progress row: current issue, current page, total issues */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Поточний випуск
              </label>
              <input
                type="text"
                value={currentIssue}
                onChange={(e) => setCurrentIssue(e.target.value)}
                placeholder="напр. 4 або 12.1"
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Поточна сторінка
              </label>
              <input
                type="number"
                min="1"
                value={currentPage}
                onChange={(e) => setCurrentPage(e.target.value)}
                placeholder="напр. 14"
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Усього випусків
              </label>
              <input
                type="number"
                min="1"
                value={totalIssues}
                onChange={(e) => setTotalIssues(e.target.value)}
                placeholder="порожньо, якщо невідомо"
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Publisher, Priority, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Publisher */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Видавництво
              </label>
              <select
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {publishers.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              {publisher === 'Інше' && (
                <input
                  type="text"
                  required
                  value={customPublisher}
                  onChange={(e) => setCustomPublisher(e.target.value)}
                  placeholder="Введіть видавництво..."
                  className="w-full mt-1.5 bg-[#181a29] border border-white/10 rounded-lg px-2.5 py-1 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Пріоритет
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {priorities.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Статус
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-300">
                Теги (максимум 5)
              </label>
              <span className="text-[11px] text-zinc-500">
                {tags.length}/5
              </span>
            </div>

            {/* Selected tags */}
            <div className="flex flex-wrap items-center gap-1.5 min-h-[30px] p-2 bg-[#181a29] border border-white/10 rounded-lg">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-md bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs flex items-center gap-1 font-medium"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-white cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {tags.length < 5 && (
                <div className="flex-1 min-w-[120px] flex items-center gap-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    placeholder={tags.length === 0 ? 'Введіть тег та натисніть Enter' : 'Додати ще...'}
                    className="w-full bg-transparent border-none text-zinc-200 text-xs focus:outline-none placeholder:text-zinc-600"
                  />
                  {tagInput.trim() && (
                    <button
                      type="button"
                      onClick={() => handleAddTag(tagInput)}
                      className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Suggestions */}
            {tagSuggestions.length > 0 && tags.length < 5 && (
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] text-zinc-500 mr-1">Підказки:</span>
                {tagSuggestions.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleAddTag(st.name)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-white/5 cursor-pointer transition-colors"
                  >
                    + {st.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Free-text Note */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Персональна нотатка (необов'язково)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Враження, на якому розділі зупинився, що сподобалося..."
              className="w-full bg-[#181a29] border border-white/10 rounded-lg p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600"
            />
          </div>

          {submitError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#161826] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Скасувати
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e)}
            disabled={isSubmitting || !title.trim()}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Збереження...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Зберегти в бібліотеку</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
