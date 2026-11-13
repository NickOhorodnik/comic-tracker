import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Comic } from '../types/comic.ts';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  comic: Comic | null;
  onClose: () => void;
  onConfirmDelete: (id: string) => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  comic,
  onClose,
  onConfirmDelete,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !comic) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirmDelete(comic.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Помилка видалення коміксу');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#121420] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-xs text-zinc-300 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Підтвердження видалення
            </h3>
            <p className="text-zinc-400 text-xs mt-0.5">
              Цю дію неможливо буде скасувати.
            </p>
          </div>
        </div>

        <p className="text-zinc-200 text-sm leading-relaxed bg-[#181a29] p-3 rounded-lg border border-white/5">
          Видалити «<span className="font-bold text-white">{comic.title}</span>» з бібліотеки?
        </p>

        {error && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Скасувати
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:bg-zinc-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Видалення...</span>
              </>
            ) : (
              <span>Видалити</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
