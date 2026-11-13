import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  ExternalLink,
  BookOpen,
  Shuffle,
  Tag,
} from 'lucide-react';
import { Comic } from '../types/comic.ts';
import { ComicCover } from './ComicCover.tsx';
import {
  getPriorityBadgeColor,
  getStatusBadgeColor,
  formatProgressInfo,
} from '../lib/comicUtils.ts';

interface RandomPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredComics: Comic[];
}

export const RandomPickerModal: React.FC<RandomPickerModalProps> = ({
  isOpen,
  onClose,
  filteredComics,
}) => {
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);

  // Eligible comics: exclude "Прочитано" and "Кинуто"
  const eligibleComics = filteredComics.filter(
    (c) => c.status !== 'Прочитано' && c.status !== 'Кинуто'
  );

  const pickRandom = () => {
    if (eligibleComics.length === 0) {
      setSelectedComic(null);
      return;
    }
    const randomIndex = Math.floor(Math.random() * eligibleComics.length);
    setSelectedComic(eligibleComics[randomIndex]);
  };

  useEffect(() => {
    if (isOpen) {
      pickRandom();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#121420] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col text-xs text-zinc-300">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#161826]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Що почитати?
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
        <div className="p-6">
          {eligibleComics.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-zinc-600" />
              <p className="text-sm text-zinc-300 font-medium">
                Немає доступних коміксів для вибору.
              </p>
              <p className="text-xs text-zinc-500">
                Усі відфільтровані комікси мають статус «Прочитано» або «Кинуто», або список порожній.
              </p>
            </div>
          ) : selectedComic ? (
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-28 h-40 shrink-0 rounded-lg overflow-hidden shadow-xl border border-white/10">
                  <ComicCover
                    src={selectedComic.cover_url}
                    alt={selectedComic.title}
                    className="w-full h-full"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {(() => {
                      const statCol = getStatusBadgeColor(selectedComic.status);
                      const prioCol = getPriorityBadgeColor(selectedComic.priority);
                      return (
                        <>
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${statCol.bg} ${statCol.text} ${statCol.border}`}
                          >
                            {selectedComic.status}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full border text-[10px] font-medium ${prioCol.bg} ${prioCol.text} ${prioCol.border}`}
                          >
                            {selectedComic.priority}
                          </span>
                        </>
                      );
                    })()}
                  </div>

                  <h3 className="text-base font-bold text-white leading-snug mb-1">
                    {selectedComic.title}
                  </h3>

                  <div className="text-[11px] text-zinc-400 font-medium mb-2">
                    {selectedComic.publisher || 'Інше'}
                  </div>

                  <div className="text-xs font-mono text-zinc-300 bg-[#181a29] p-2 rounded border border-white/5 mb-2">
                    {formatProgressInfo(selectedComic).displayText}
                  </div>

                  {selectedComic.tags && selectedComic.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedComic.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] flex items-center gap-1"
                        >
                          <Tag className="w-2 h-2 text-zinc-500" />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedComic.note && (
                <div className="bg-[#181a29] p-3 rounded-lg border border-white/5 text-zinc-300 text-xs leading-relaxed">
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold block mb-1">
                    Нотатка:
                  </span>
                  {selectedComic.note}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-[#161826] flex items-center justify-between">
          {eligibleComics.length > 1 ? (
            <button
              type="button"
              onClick={pickRandom}
              className="px-3.5 py-2 rounded-lg bg-[#202336] hover:bg-[#292d45] text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-amber-400" />
              <span>Інший варіант</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors cursor-pointer"
            >
              Закрити
            </button>

            {selectedComic && (
              <a
                href={selectedComic.reading_url || selectedComic.series_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
              >
                <span>Читати зараз</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
