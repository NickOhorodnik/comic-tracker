import React, { useState } from 'react';
import {
  ExternalLink,
  BookOpen,
  Edit2,
  Trash2,
  SlidersHorizontal,
  Tag,
  Globe,
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
  formatDateUk,
} from '../lib/comicUtils.ts';

interface DetailedViewProps {
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

export const DetailedView: React.FC<DetailedViewProps> = ({
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
    <div className="flex flex-col gap-4">
      {comics.map((comic) => {
        const priorityColors = getPriorityBadgeColor(comic.priority);
        const statusColors = getStatusBadgeColor(comic.status);
        const progressInfo = formatProgressInfo(comic);
        const comicFolders = collections.filter((col) => col.comic_ids.includes(comic.id));
        const isMenuOpen = activeMenuId === comic.id;

        return (
          <div
            key={comic.id}
            className="bg-[#131522] border border-white/10 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-stretch gap-5 shadow-lg hover:border-white/20 transition-all group relative"
          >
            {/* Left: Large Cover Image */}
            <div className="relative w-28 sm:w-32 md:w-36 shrink-0 self-center md:self-start shadow-md rounded-lg overflow-hidden">
              <ComicCover
                src={comic.cover_url}
                alt={comic.title}
                aspectRatioClass="aspect-[2/3]"
                className="w-full h-full group-hover:scale-[1.02] transition-transform duration-300"
              />

              {/* Three dots menu top-right of cover */}
              <div className="absolute top-2 right-2 z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setActiveMenuId(isMenuOpen ? null : comic.id);
                  }}
                  className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
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
                    <div className="absolute left-0 sm:left-auto sm:right-0 mt-1 w-44 bg-[#1a1c2b] border border-white/15 rounded-lg shadow-2xl py-1 z-40 text-xs font-normal">
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

            {/* Center: Main Information */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                {/* Header row: Title & Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center flex-row whitespace-nowrap gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${statusColors.bg} ${statusColors.text} ${statusColors.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot} shrink-0`} />
                    {comic.status}
                  </span>

                  <span
                    className={`inline-flex items-center flex-row whitespace-nowrap px-2 py-0.5 rounded-full border text-[11px] font-medium ${priorityColors.bg} ${priorityColors.text} ${priorityColors.border}`}
                  >
                    {comic.priority}
                  </span>

                  <span className="inline-flex items-center flex-row whitespace-nowrap text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-white/5 font-medium">
                    {comic.publisher || 'Інше'}
                  </span>

                  {comic.source_domain && (
                    <span className="inline-flex items-center flex-row whitespace-nowrap text-[11px] text-zinc-400 font-mono gap-1">
                      <Globe className="w-3 h-3 text-zinc-500 shrink-0" />
                      {comic.source_domain}
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight mb-2">
                  {comic.title}
                </h3>

                {/* Free text Note */}
                {comic.note ? (
                  <p className="text-xs text-zinc-300 line-clamp-3 bg-[#181a29]/80 border border-white/5 rounded-lg p-2.5 mb-3 leading-relaxed">
                    {comic.note}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 italic mb-3">Немає нотатки</p>
                )}

                {/* Tags & Folders */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  {comic.tags &&
                    comic.tags.map((tag, idx) => (
                      <span
                        key={`${comic.id}_tag_${tag}_${idx}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 border border-white/5 text-[11px]"
                      >
                        <Tag className="w-2.5 h-2.5 text-zinc-400" />
                        {tag}
                      </span>
                    ))}

                  {comicFolders.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => onSelectFolder?.(col.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 text-[11px] hover:bg-indigo-900/60 hover:text-white transition-colors cursor-pointer"
                      title="Відкрити папку"
                    >
                      <Folder className="w-2.5 h-2.5 text-indigo-400" />
                      <span>{col.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Timestamp footer */}
              <div className="text-[11px] text-zinc-400 pt-2 border-t border-white/5 flex items-center justify-between">
                <span>Оновлено: {formatDateUk(comic.updated_at)}</span>
                {comic.created_at && (
                  <span className="hidden sm:inline">
                    Додано: {formatDateUk(comic.created_at)}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Progress & Action Column */}
            <div className="w-full md:w-56 shrink-0 flex flex-col justify-between pt-3 md:pt-0 md:pl-5 md:border-l border-white/5 border-t md:border-t-0">
              {/* Progress Box */}
              <div className="bg-[#181a29] border border-white/10 rounded-xl p-3.5 mb-4">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Прогрес</span>
                  {progressInfo.percentage !== null && (
                    <span className="text-indigo-400 font-bold font-mono">
                      {progressInfo.percentage}%
                    </span>
                  )}
                </div>

                <div className="text-sm font-bold text-zinc-100 font-mono mb-2">
                  {progressInfo.displayText}
                </div>

                {/* Percentage progress bar (only if total_issues is known) */}
                {progressInfo.hasTotal && progressInfo.percentage !== null && (
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden mb-2">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressInfo.percentage}%` }}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onOpenQuickProgress(comic)}
                  className="w-full mt-1 py-1 px-2 rounded-md bg-[#212437] hover:bg-[#2a2e47] text-zinc-300 hover:text-white text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                  <span>Змінити прогрес</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {/* Primary Action: Continue Reading */}
                <a
                  href={comic.reading_url || comic.series_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all text-center"
                >
                  <span>Продовжити читання</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {/* Secondary Action: Open Series */}
                <a
                  href={comic.series_url || comic.reading_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 px-3 rounded-lg bg-[#181a29] hover:bg-[#202336] text-zinc-300 hover:text-white border border-white/10 text-xs flex items-center justify-center gap-1.5 transition-colors text-center"
                >
                  <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Відкрити серію</span>
                </a>

                {/* Manage Folders button */}
                <button
                  type="button"
                  onClick={() => onOpenManageFolders?.(comic)}
                  className="w-full py-1.5 px-3 rounded-lg bg-[#181a29] hover:bg-[#202336] text-zinc-300 hover:text-white border border-white/10 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Папки {comicFolders.length > 0 ? `(${comicFolders.length})` : ''}</span>
                </button>

                {/* Remove from current folder if in folder view */}
                {activeCollectionId && onRemoveFromFolder && (
                  <button
                    type="button"
                    onClick={() => onRemoveFromFolder(comic, activeCollectionId)}
                    className="w-full py-1.5 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FolderMinus className="w-3.5 h-3.5 text-rose-400" />
                    <span>Вилучити з папки</span>
                  </button>
                )}

                {/* Bottom tool buttons: Edit & Delete */}
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => onOpenEdit(comic)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-[#181a29] hover:bg-[#202336] text-zinc-300 hover:text-white border border-white/10 text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-zinc-400" />
                    <span>Редагувати</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRequestDelete(comic)}
                    className="py-1.5 px-2.5 rounded-lg bg-[#181a29] hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-white/10 text-xs flex items-center justify-center transition-colors cursor-pointer"
                    title="Видалити"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
