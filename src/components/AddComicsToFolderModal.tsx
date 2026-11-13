import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, FolderPlus, Check, AlertCircle, BookOpen } from 'lucide-react';
import { Comic, Collection } from '../types/comic.ts';
import { ComicCover } from './ComicCover.tsx';

interface AddComicsToFolderModalProps {
  isOpen: boolean;
  folder: Collection | null;
  allComics: Comic[];
  onClose: () => void;
  onAddComics: (folderId: string, comicIds: string[]) => Promise<void>;
}

export const AddComicsToFolderModal: React.FC<AddComicsToFolderModalProps> = ({
  isOpen,
  folder,
  allComics,
  onClose,
  onAddComics,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available comics = comics not already in the folder
  const availableComics = useMemo(() => {
    if (!folder) return [];
    const inFolderSet = new Set(folder.comic_ids);
    return allComics.filter((c) => !inFolderSet.has(c.id));
  }, [allComics, folder]);

  const filteredComics = useMemo(() => {
    if (!search.trim()) return availableComics;
    const q = search.toLowerCase().trim();
    return availableComics.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.publisher || '').toLowerCase().includes(q) ||
        (c.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }, [availableComics, search]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIds(new Set());
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !folder) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredComics.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredComics.map((c) => c.id)));
    }
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await onAddComics(folder.id, Array.from(selectedIds));
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Не вдалося додати комікси');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#131522] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#161828] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Додати комікси до папки</h3>
              <p className="text-[11px] text-zinc-400">Папка: «{folder.name}»</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 border-b border-white/5 bg-[#141624] space-y-3 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Шукати комікс за назвою або видавцем..."
              className="w-full bg-[#181a29] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>
              Доступно: <strong className="text-white">{filteredComics.length}</strong> з {availableComics.length}
            </span>
            {filteredComics.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                {selectedIds.size === filteredComics.length ? 'Зняти вибір' : 'Обрати всі знайдені'}
              </button>
            )}
          </div>
        </div>

        {/* Content / Comics list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {availableComics.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 space-y-2">
              <BookOpen className="w-10 h-10 mx-auto text-zinc-600" />
              <p className="text-sm font-medium text-white">Усі комікси вже у цій папці</p>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Усі комікси з вашої бібліотеки вже додано до цієї папки.
              </p>
            </div>
          ) : filteredComics.length === 0 ? (
            <div className="py-10 text-center text-zinc-400 space-y-1">
              <p className="text-sm font-medium text-white">Нічого не знайдено</p>
              <p className="text-xs text-zinc-500">Спробуйте інший пошуковий запит.</p>
            </div>
          ) : (
            filteredComics.map((comic) => {
              const isSelected = selectedIds.has(comic.id);
              return (
                <div
                  key={comic.id}
                  onClick={() => toggleSelect(comic.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/15 border-indigo-500/40 text-white'
                      : 'bg-[#181a29] border-white/5 text-zinc-300 hover:bg-[#202336] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'border-white/20 bg-black/20'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                    <div className="w-8 h-12 rounded overflow-hidden shrink-0 shadow-sm">
                      <ComicCover src={comic.cover_url} alt={comic.title} className="w-full h-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{comic.title}</h4>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {comic.publisher || 'Інше'} • #{comic.current_issue || '1'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/10 bg-[#161828] shrink-0">
          <span className="text-xs text-zinc-400">
            Обрано для додавання: <strong className="text-white">{selectedIds.size}</strong>
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-[#181a29] hover:bg-[#202336] text-zinc-300 text-xs font-medium border border-white/10 transition-colors cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={isSubmitting || selectedIds.size === 0}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                'Додавання...'
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Додати до папки ({selectedIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
