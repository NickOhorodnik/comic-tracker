import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Comic, StatusItem } from '../types/comic.ts';
import { extractPageFromUrl } from '../lib/comicUtils.ts';

interface QuickProgressModalProps {
  isOpen: boolean;
  comic: Comic | null;
  onClose: () => void;
  onSave: (
    id: string,
    patch: { current_issue?: string; current_page?: number | null; reading_url?: string; status?: string }
  ) => Promise<void>;
  statuses: StatusItem[];
}

export const QuickProgressModal: React.FC<QuickProgressModalProps> = ({
  isOpen,
  comic,
  onClose,
  onSave,
  statuses,
}) => {
  if (!isOpen || !comic) return null;

  return (
    <QuickProgressForm
      key={comic.id}
      comic={comic}
      onClose={onClose}
      onSave={onSave}
      statuses={statuses}
    />
  );
};

const QuickProgressForm: React.FC<{
  comic: Comic;
  onClose: () => void;
  onSave: (
    id: string,
    patch: { current_issue?: string; current_page?: number | null; reading_url?: string; status?: string }
  ) => Promise<void>;
  statuses: StatusItem[];
}> = ({ comic, onClose, onSave, statuses }) => {
  const [currentIssue, setCurrentIssue] = useState(comic.current_issue || '');
  const [currentPage, setCurrentPage] = useState<string>(
    comic.current_page !== null && comic.current_page !== undefined ? String(comic.current_page) : ''
  );
  const [readingUrl, setReadingUrl] = useState(comic.reading_url || '');
  const [status, setStatus] = useState(comic.status || 'Читаю');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If reading_url contains #page-X, auto update current_page
  const handleReadingUrlChange = (val: string) => {
    setReadingUrl(val);
    const extracted = extractPageFromUrl(val);
    if (extracted !== null) {
      setCurrentPage(String(extracted));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(comic.id, {
        current_issue: currentIssue.trim(),
        current_page: currentPage ? parseInt(currentPage, 10) : null,
        reading_url: readingUrl.trim(),
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Помилка при збереженні прогресу');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#121420] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-xs text-zinc-300">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#161826]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Швидкий прогрес
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-[#181a29] border border-white/5 rounded-lg p-3">
            <span className="text-[11px] text-zinc-400 block mb-0.5">Комікс:</span>
            <span className="text-sm font-bold text-white line-clamp-1">{comic.title}</span>
            {comic.total_issues && (
              <span className="text-[11px] text-indigo-400 block mt-0.5 font-mono">
                Всього випусків у серії: {comic.total_issues}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Поточний випуск
              </label>
              <input
                type="text"
                value={currentIssue}
                onChange={(e) => setCurrentIssue(e.target.value)}
                placeholder="напр. 5"
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
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
                placeholder="напр. 12"
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-zinc-300">
                Посилання на читання (Reading URL)
              </label>
              {readingUrl && (
                <a
                  href={readingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Відкрити</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
            <input
              type="url"
              value={readingUrl}
              onChange={(e) => handleReadingUrlChange(e.target.value)}
              placeholder="https://...#page-14"
              className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Якщо посилання містить #page-X, номер сторінки оновиться автоматично.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Статус читання
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {statuses.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Оновлення...</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3" />
                  <span>Зберегти прогрес</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
