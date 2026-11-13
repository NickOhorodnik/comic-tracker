import React, { useState, useEffect } from 'react';
import { X, Folder, FolderPlus, Edit3, AlertCircle } from 'lucide-react';
import { Collection } from '../types/comic.ts';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  folderToEdit?: Collection | null;
  existingFolders: Collection[];
  isSheetsConnected?: boolean;
  onOpenGoogleSheets?: () => void;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  folderToEdit,
  existingFolders,
  isSheetsConnected = true,
  onOpenGoogleSheets,
}) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(folderToEdit);

  useEffect(() => {
    if (isOpen) {
      setName(folderToEdit ? folderToEdit.name : '');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, folderToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Введіть назву папки');
      return;
    }
    if (trimmed.length > 60) {
      setError('Назва не повинна бути довшою за 60 символів');
      return;
    }

    const isDuplicate = existingFolders.some(
      (f) =>
        (!folderToEdit || f.id !== folderToEdit.id) &&
        f.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setError(`Папка з назвою «${trimmed}» вже існує`);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(trimmed);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Не вдалося зберегти папку');
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
              {isEditing ? <Edit3 className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                {isEditing ? 'Перейменувати папку' : 'Створити папку'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {isEditing
                  ? 'Оновлює назву папки на сторінці COLLECTIONS'
                  : 'Створює папку на сторінці COLLECTIONS та синхронізує колонку folders'}
              </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {!isSheetsConnected && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-xs text-indigo-200">
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-[11px] leading-tight">
                  Папку буде збережено у бібліотеці та синхронізовано у таблицю на сторінку COLLECTIONS після підключення Google Sheets.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="folderName" className="block text-xs font-semibold text-zinc-300">
              Назва папки <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Folder className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                id="folderName"
                type="text"
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="напр. Marvel, Темні лицарі, Улюблені..."
                maxLength={60}
                className="w-full bg-[#181a29] border border-white/10 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-500 px-1 pt-0.5">
              <span>Запис на сторінці COLLECTIONS та в колонці folders</span>
              <span>{name.length}/60</span>
            </div>
          </div>

          {/* Footer Actions */}
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
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Збереження...</span>
              ) : isEditing ? (
                <span>Зберегти назву</span>
              ) : (
                <span>Створити папку</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
