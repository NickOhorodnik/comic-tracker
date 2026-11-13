import React, { useState, useEffect } from 'react';
import { X, Folder, FolderPlus, Check, Plus, AlertCircle } from 'lucide-react';
import { Comic, Collection } from '../types/comic.ts';
import { ComicCover } from './ComicCover.tsx';

interface ComicFolderModalProps {
  isOpen: boolean;
  comic: Comic | null;
  folders: Collection[];
  onClose: () => void;
  onSave: (comicId: string, folderIds: string[]) => Promise<void>;
  onCreateFolder: (name: string) => Promise<Collection>;
}

export const ComicFolderModal: React.FC<ComicFolderModalProps> = ({
  isOpen,
  comic,
  folders,
  onClose,
  onSave,
  onCreateFolder,
}) => {
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && comic) {
      const initial = new Set<string>();
      folders.forEach((f) => {
        if (f.comic_ids.includes(comic.id)) {
          initial.add(f.id);
        }
      });
      setSelectedFolderIds(initial);
      setIsCreatingNew(false);
      setNewFolderName('');
      setError(null);
    }
  }, [isOpen, comic, folders]);

  if (!isOpen || !comic) return null;

  const toggleFolder = (folderId: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleCreateNewFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    if (folders.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(`Папка з назвою «${trimmed}» вже існує`);
      return;
    }

    try {
      setError(null);
      const newCol = await onCreateFolder(trimmed);
      setSelectedFolderIds((prev) => new Set(prev).add(newCol.id));
      setNewFolderName('');
      setIsCreatingNew(false);
    } catch (err: any) {
      setError(err?.message || 'Не вдалося створити папку');
    }
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(comic.id, Array.from(selectedFolderIds));
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Не вдалося зберегти папки');
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
      <div className="bg-[#131522] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#161828]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Папки коміксу</h3>
              <p className="text-[11px] text-zinc-400">Керування приналежністю до папок</p>
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

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Comic Info preview */}
          <div className="flex items-center gap-3 p-2.5 bg-[#181a29] border border-white/5 rounded-xl">
            <div className="w-10 h-14 shrink-0 rounded overflow-hidden">
              <ComicCover src={comic.cover_url} alt={comic.title} className="w-full h-full" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">{comic.title}</h4>
              <p className="text-[11px] text-zinc-400">{comic.publisher || 'Інше'}</p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Folder checklist */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
              <span>Оберіть папки:</span>
              <span className="text-[11px] text-zinc-500 font-normal">
                Обрано: {selectedFolderIds.size}
              </span>
            </div>

            {folders.length === 0 ? (
              <div className="py-6 text-center bg-[#181a29]/60 border border-dashed border-white/10 rounded-xl p-4">
                <Folder className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-medium mb-1">Ще немає створених папок</p>
                <p className="text-[11px] text-zinc-500 mb-3">
                  Створіть першу папку для організації ваших коміксів
                </p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {folders.map((folder) => {
                  const isChecked = selectedFolderIds.has(folder.id);
                  return (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => toggleFolder(folder.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs text-left transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-600/15 border-indigo-500/40 text-white'
                          : 'bg-[#181a29] border-white/5 text-zinc-300 hover:bg-[#202336] hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'border-white/20 bg-black/20'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
                        <Folder className={`w-3.5 h-3.5 ${isChecked ? 'text-indigo-400' : 'text-zinc-500'}`} />
                        <span className="font-medium truncate">{folder.name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 rounded bg-black/20 border border-white/5 ml-2 shrink-0">
                        {folder.comic_ids.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Inline Create Folder */}
          {isCreatingNew ? (
            <form onSubmit={handleCreateNewFolder} className="pt-2 border-t border-white/5 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Назва нової папки..."
                  maxLength={60}
                  className="flex-1 bg-[#181a29] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium cursor-pointer transition-colors"
                >
                  Додати
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-2.5 py-1.5 rounded-xl bg-[#181a29] text-zinc-400 hover:text-white text-xs border border-white/10 cursor-pointer"
                >
                  Скасувати
                </button>
              </div>
            </form>
          ) : (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Створити нову папку</span>
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
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
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Збереження...' : 'Зберегти зміни'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
