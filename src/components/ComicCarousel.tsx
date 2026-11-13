import React, { useState, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  BookOpen,
  SlidersHorizontal,
  Folder,
  FolderMinus,
  Edit2,
  Trash2,
  Tag,
  MoreVertical,
} from 'lucide-react';
import { Comic, Collection } from '../types/comic.ts';
import { ComicCover } from './ComicCover.tsx';
import {
  getPriorityBadgeColor,
  getStatusBadgeColor,
  formatProgressInfo,
} from '../lib/comicUtils.ts';

interface ComicCarouselProps {
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

export const ComicCarousel: React.FC<ComicCarouselProps> = ({
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  if (comics.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { clientWidth } = scrollContainerRef.current;
      const scrollAmount = direction === 'left' ? -clientWidth * 0.75 : clientWidth * 0.75;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group/carousel">
      {/* Navigation Arrows - Centered vertically relative to cards */}
      {comics.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scroll('left')}
            className="absolute -left-4 sm:-left-5 top-[42%] -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[#1c1f33]/95 border border-white/25 text-white flex items-center justify-center shadow-2xl opacity-0 group-hover/carousel:opacity-100 hover:bg-indigo-600 transition-all cursor-pointer"
            title="Попередні"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="absolute -right-4 sm:-right-5 top-[42%] -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[#1c1f33]/95 border border-white/25 text-white flex items-center justify-center shadow-2xl opacity-0 group-hover/carousel:opacity-100 hover:bg-indigo-600 transition-all cursor-pointer"
            title="Наступні"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Slider Track */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 px-1 scroll-smooth snap-x snap-mandatory custom-scrollbar"
      >
        {comics.map((comic) => {
          const priorityColors = getPriorityBadgeColor(comic.priority);
          const statusColors = getStatusBadgeColor(comic.status);
          const progressInfo = formatProgressInfo(comic);
          const comicFolders = collections.filter((col) => col.comic_ids.includes(comic.id));
          const isMenuOpen = activeMenuId === comic.id;

          return (
            <div
              key={comic.id}
              className="snap-start shrink-0 w-[220px] sm:w-[240px] md:w-[260px] lg:w-[280px] bg-[#131522] border border-white/10 hover:border-white/20 rounded-2xl overflow-hidden flex flex-col shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-indigo-500/10 relative group"
            >
              {/* Cover Area (2:3 aspect ratio) */}
              <div className="relative w-full aspect-[2/3] overflow-hidden bg-black/50">
                <ComicCover
                  src={comic.cover_url}
                  alt={comic.title}
                  aspectRatioClass="aspect-[2/3]"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Status Badge in top-left */}
                <div className="absolute top-2.5 left-2.5 z-10">
                  <span
                    className={`inline-flex items-center flex-row whitespace-nowrap gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md shadow-md ${statusColors.bg} ${statusColors.text} border ${statusColors.border}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot} shrink-0`} />
                    {comic.status}
                  </span>
                </div>

                {/* Three dots menu top-right */}
                <div className="absolute top-2.5 right-2.5 z-20">
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

                {/* Progress bar overlay at bottom of cover */}
                {progressInfo.hasTotal && progressInfo.percentage !== null && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400"
                      style={{ width: `${progressInfo.percentage}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Content info */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] mb-1.5">
                    <span
                      className={`inline-flex items-center flex-row whitespace-nowrap px-1.5 py-0.5 rounded border font-medium ${priorityColors.bg} ${priorityColors.text} ${priorityColors.border}`}
                    >
                      {comic.priority}
                    </span>
                    <span className="text-zinc-400 font-medium truncate max-w-[120px] inline-flex items-center flex-row">
                      {comic.publisher || 'Інше'}
                    </span>
                  </div>

                  <h4
                    className="font-bold text-sm text-zinc-100 group-hover:text-indigo-400 transition-colors line-clamp-1 leading-tight mb-1.5"
                    title={comic.title}
                  >
                    {comic.title}
                  </h4>

                  {/* Current issue & progress */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300 bg-[#181a29] px-2.5 py-1 rounded-xl border border-white/5 mb-2">
                    <span className="truncate inline-flex items-center flex-row whitespace-nowrap">{progressInfo.displayText}</span>
                    {progressInfo.percentage !== null && (
                      <span className="text-emerald-400 font-bold ml-1 inline-flex items-center flex-row whitespace-nowrap">
                        {progressInfo.percentage}%
                      </span>
                    )}
                  </div>

                  {/* Tags & Folders */}
                  <div className="flex flex-wrap gap-1">
                    {comic.tags &&
                      comic.tags.slice(0, 1).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded inline-flex items-center flex-row whitespace-nowrap gap-1"
                        >
                          <Tag className="w-2 h-2 text-zinc-500 shrink-0" />
                          {tag}
                        </span>
                      ))}
                    {comicFolders.map((col) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => onSelectFolder?.(col.id)}
                        className="text-[10px] text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-indigo-900/60 cursor-pointer"
                        title="Відкрити папку"
                      >
                        <Folder className="w-2 h-2 text-indigo-400" />
                        <span className="truncate max-w-[70px]">{col.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/5">
                  <a
                    href={comic.reading_url || comic.series_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-1 shadow-md shadow-indigo-600/20 transition-all text-center"
                    title="Продовжити читання"
                  >
                    <span>Читати</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    type="button"
                    onClick={() => onOpenQuickProgress(comic)}
                    className="py-1.5 px-2 rounded-xl bg-[#1b1e32] hover:bg-[#252845] text-zinc-300 hover:text-white border border-white/10 text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Змінити прогрес"
                  >
                    <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                    <span>Прогрес</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
