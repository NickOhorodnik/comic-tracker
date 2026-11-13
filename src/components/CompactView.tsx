import React, { useState } from 'react';
import {
  ExternalLink,
  BookOpen,
  Edit2,
  Trash2,
  SlidersHorizontal,
  Folder,
  FolderMinus,
  MoreVertical,
} from 'lucide-react';
import { Comic, Collection } from '../types/comic.ts';
import { ComicCover } from './ComicCover.tsx';
import {
  getPriorityBadgeColor,
  getStatusBadgeColor,
  formatProgressInfo,
} from '../lib/comicUtils.ts';

interface CompactViewProps {
  comics: Comic[];
  collections?: Collection[];
  activeCollectionId?: string | null;
  onOpenQuickProgress: (comic: Comic) => void;
  onOpenEdit: (comic: Comic) => void;
  onRequestDelete: (comic: Comic) => void;
  onOpenManageFolders?: (comic: Comic) => void;
  onRemoveFromFolder?: (comic: Comic, collectionId: string) => void;
  onSelectFolder?: (folderId: string) => void;
}

export const CompactView: React.FC<CompactViewProps> = ({
  comics,
  collections = [],
  activeCollectionId = null,
  onOpenQuickProgress,
  onOpenEdit,
  onRequestDelete,
  onOpenManageFolders,
  onRemoveFromFolder,
  onSelectFolder,
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  if (comics.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#12141f] border border-white/10 rounded-xl overflow-hidden divide-y divide-white/5 shadow-xl">
      {comics.map((comic) => {
        const priorityColors = getPriorityBadgeColor(comic.priority);
        const statusColors = getStatusBadgeColor(comic.status);
        const progressInfo = formatProgressInfo(comic);
        const isMenuOpen = activeMenuId === comic.id;

        return (
          <div
            key={comic.id}
            className="p-3.5 hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
          >
            {/* Left: Cover & Title & Metadata */}
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="w-10 h-14 shrink-0 shadow-sm rounded overflow-hidden">
                <ComicCover src={comic.cover_url} alt={comic.title} className="w-full h-full" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-semibold text-zinc-100 text-sm hover:text-indigo-400 transition-colors line-clamp-1 inline-flex items-center flex-row">
                    {comic.title}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-white/5 font-medium shrink-0 inline-flex items-center flex-row whitespace-nowrap">
                    {comic.publisher || 'Інше'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-zinc-400 text-[11px]">
                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center flex-row whitespace-nowrap gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot} shrink-0`} />
                    {comic.status}
                  </span>

                  {/* Priority badge */}
                  <span
                    className={`inline-flex items-center flex-row whitespace-nowrap px-1.5 py-0.5 rounded border text-[10px] font-medium ${priorityColors.bg} ${priorityColors.text} ${priorityColors.border}`}
                  >
                    {comic.priority}
                  </span>

                  {/* Progress indicator */}
                  <span className="font-mono text-zinc-300 inline-flex items-center flex-row whitespace-nowrap">
                    {progressInfo.displayText}
                  </span>

                  {/* Domain badge */}
                  {comic.source_domain && (
                    <span className="text-zinc-500 font-mono text-[10px]">
                      • {comic.source_domain}
                    </span>
                  )}

                  {/* Folders */}
                  {collections
                    .filter((col) => col.comic_ids.includes(comic.id))
                    .map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => onSelectFolder?.(col.id)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 text-[10px] hover:bg-indigo-900/60 cursor-pointer"
                        title="Відкрити папку"
                      >
                        <Folder className="w-2.5 h-2.5 text-indigo-400" />
                        <span>{col.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
              {/* Primary action: Continue Reading */}
              <a
                href={comic.reading_url || comic.series_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px] inline-flex items-center gap-1 transition-colors shadow-sm"
                title="Продовжити читання"
              >
                <span>Читати</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {/* Secondary action: Open Series */}
              <a
                href={comic.series_url || comic.reading_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1.5 rounded-lg bg-[#1a1c2a] hover:bg-[#25283c] text-zinc-300 hover:text-white border border-white/10 text-[11px] inline-flex items-center gap-1 transition-colors"
                title="Відкрити серію"
              >
                <BookOpen className="w-3 h-3 text-zinc-400" />
                <span className="hidden md:inline">Серія</span>
              </a>

              {/* Folders Management */}
              <button
                type="button"
                onClick={() => onOpenManageFolders?.(comic)}
                className="p-1.5 rounded-lg bg-[#1a1c2a] hover:bg-[#25283c] text-zinc-400 hover:text-indigo-400 border border-white/10 transition-colors cursor-pointer"
                title="Папки"
              >
                <Folder className="w-3.5 h-3.5" />
              </button>

              {/* Remove from folder if in folder view */}
              {activeCollectionId && onRemoveFromFolder && (
                <button
                  type="button"
                  onClick={() => onRemoveFromFolder(comic, activeCollectionId)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                  title="Вилучити з папки"
                >
                  <FolderMinus className="w-3.5 h-3.5 text-rose-400" />
                </button>
              )}

              {/* Three dots menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setActiveMenuId(isMenuOpen ? null : comic.id);
                  }}
                  className="p-1.5 rounded-lg bg-[#1a1c2a] hover:bg-[#25283c] text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  title="Опції"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Dropdown menu */}
                {isMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setActiveMenuId(null);
                      }}
                    />
                    <div className="absolute right-0 mt-1 w-44 bg-[#1a1c2b] border border-white/15 rounded-lg shadow-2xl py-1 z-40 text-xs font-normal">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                          onOpenQuickProgress(comic);
                        }}
                        className="w-full px-3 py-1.5 text-left text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Швидкий прогрес</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                          onOpenEdit(comic);
                        }}
                        className="w-full px-3 py-1.5 text-left text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Редагувати</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                          onOpenManageFolders?.(comic);
                        }}
                        className="w-full px-3 py-1.5 text-left text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                      >
                        <Folder className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Папки</span>
                      </button>
                      {activeCollectionId && onRemoveFromFolder && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(null);
                            onRemoveFromFolder(comic, activeCollectionId);
                          }}
                          className="w-full px-3 py-1.5 text-left text-rose-300 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                        >
                          <FolderMinus className="w-3.5 h-3.5 text-rose-400" />
                          <span>Вилучити з папки</span>
                        </button>
                      )}
                      <div className="my-1 border-t border-white/10" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(null);
                          onRequestDelete(comic);
                        }}
                        className="w-full px-3 py-1.5 text-left text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Видалити</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
