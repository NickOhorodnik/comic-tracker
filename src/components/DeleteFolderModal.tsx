import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Collection } from '../types/comic.ts';

interface DeleteFolderModalProps {
  isOpen: boolean;
  folder: Collection | null;
  onClose: () => void;
  onConfirmDelete: (id: string) => Promise<void> | void;
}

export const DeleteFolderModal: React.FC<DeleteFolderModalProps> = ({
  isOpen,
  folder,
  onClose,
  onConfirmDelete,
}) => {
  if (!isOpen || !folder) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#131522] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#161828]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Видалити папку?</h3>
              <p className="text-[11px] text-zinc-400">Підтвердження дії</p>
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

        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-300 leading-relaxed">
            Ви дійсно бажаєте видалити папку <strong className="text-white">«{folder.name}»</strong>?
          </p>
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
            <p className="font-semibold text-white">Комікси не буде видалено</p>
            <p className="text-indigo-200/80">
              Усі комікси ({folder.comic_ids.length}) залишаться у вашій основній бібліотеці.
              Видаляється лише сама папка як організаційна група.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#181a29] hover:bg-[#202336] text-zinc-300 text-xs font-medium border border-white/10 transition-colors cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirmDelete(folder.id);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              Видалити папку
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
