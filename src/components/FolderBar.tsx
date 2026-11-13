import React from 'react';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  BookOpen,
} from 'lucide-react';
import { Collection } from '../types/comic.ts';

interface FolderBarProps {
  folders: Collection[];
  activeFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onOpenCreateFolder: () => void;
  onOpenRenameFolder: (folder: Collection) => void;
  onOpenDeleteFolder: (folder: Collection) => void;
  onOpenAddComicsToFolder: (folder: Collection) => void;
  totalComicsCount: number;
  getFolderComicCount?: (folder: Collection) => number;
}

export const FolderBar: React.FC<FolderBarProps> = ({
  folders,
  activeFolderId,
  onSelectFolder,
  onOpenCreateFolder,
  onOpenRenameFolder,
  onOpenDeleteFolder,
  onOpenAddComicsToFolder,
  totalComicsCount,
  getFolderComicCount,
}) => {
  const activeFolder = folders.find((f) => f.id === activeFolderId) || null;
  const activeFolderCount = activeFolder
    ? getFolderComicCount
      ? getFolderComicCount(activeFolder)
      : activeFolder.comic_ids.length
    : 0;

  return (
    <div className="space-y-3">
      {/* Horizontal Folders Navigation Carousel/Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 custom-scrollbar">
        {/* Section title */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 shrink-0 pr-1">
          <Folder className="w-3.5 h-3.5 text-indigo-400" />
          <span>Папки:</span>
        </div>

        {/* All Comics chip */}
        <button
          type="button"
          onClick={() => onSelectFolder(null)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all shrink-0 cursor-pointer ${
            activeFolderId === null
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
              : 'bg-[#141624] text-zinc-300 border-white/10 hover:bg-[#1c1f32] hover:text-white'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Усі комікси</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              activeFolderId === null ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-400'
            }`}
          >
            {totalComicsCount}
          </span>
        </button>

        {/* Folder items */}
        {folders.map((folder) => {
          const isActive = folder.id === activeFolderId;
          const count = getFolderComicCount ? getFolderComicCount(folder) : folder.comic_ids.length;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20'
                  : 'bg-[#141624] text-zinc-300 border-white/10 hover:bg-[#1c1f32] hover:text-white'
              }`}
            >
              {isActive ? (
                <FolderOpen className="w-3.5 h-3.5 text-indigo-200" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span className="max-w-[140px] truncate">{folder.name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Create Folder button */}
        <button
          type="button"
          onClick={onOpenCreateFolder}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-indigo-300 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 transition-colors shrink-0 cursor-pointer"
          title="Створити нову папку"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Створити папку</span>
        </button>
      </div>

      {/* Active Folder Header Banner */}
      {activeFolder && (
        <div className="bg-[#141727] border border-indigo-500/30 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Папка: «{activeFolder.name}»
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                  {activeFolderCount}{' '}
                  {activeFolderCount === 1
                    ? 'комікс'
                    : activeFolderCount > 1 && activeFolderCount < 5
                    ? 'комікси'
                    : 'коміксів'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Перегляд коміксів, згрупованих у цій папці
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Add comics to this folder */}
            <button
              type="button"
              onClick={() => onOpenAddComicsToFolder(activeFolder)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Додати комікси</span>
            </button>

            {/* Rename */}
            <button
              type="button"
              onClick={() => onOpenRenameFolder(activeFolder)}
              className="px-3 py-1.5 rounded-xl bg-[#1b1e32] hover:bg-[#232742] text-zinc-300 hover:text-white border border-white/10 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Перейменувати папку"
            >
              <Edit2 className="w-3 h-3 text-zinc-400" />
              <span>Перейменувати</span>
            </button>

            {/* Delete Folder */}
            <button
              type="button"
              onClick={() => onOpenDeleteFolder(activeFolder)}
              className="p-2 rounded-xl bg-[#1b1e32] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-white/10 text-xs font-medium transition-colors cursor-pointer"
              title="Видалити папку"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Back to all comics */}
            <button
              type="button"
              onClick={() => onSelectFolder(null)}
              className="px-3 py-1.5 rounded-xl bg-[#1b1e32] hover:bg-[#232742] text-zinc-400 hover:text-white border border-white/10 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Усі комікси</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
