import React from 'react';
import {
  BookOpen,
  Plus,
  Sparkles,
  LayoutGrid,
  List,
  Rows,
  Sheet,
  Search,
  X,
  RefreshCw,
  Globe,
} from 'lucide-react';
import { ViewMode } from '../types/comic.ts';

interface NavbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenAddModal: () => void;
  onOpenRandomModal: () => void;
  onOpenSheetsModal: () => void;
  onOpenIntegration: () => void;
  onSyncRefresh: () => void;
  isSyncing: boolean;
  sheetsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onOpenAddModal,
  onOpenRandomModal,
  onOpenSheetsModal,
  onOpenIntegration,
  onSyncRefresh,
  isSyncing,
  sheetsConnected,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0d0e15]/90 backdrop-blur-md border-b border-white/10 px-4 lg:px-8 py-3">
      <div className="w-full max-w-full mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand Title */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Моя бібліотека коміксів
              </h1>
              <div className="flex items-center gap-2 text-[12px] text-zinc-400">
                <button
                  type="button"
                  onClick={onOpenSheetsModal}
                  className="inline-flex items-center gap-1.5 hover:underline cursor-pointer transition-colors"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sheetsConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400'
                    }`}
                  />
                  <span>
                    {sheetsConnected ? 'Google Sheets' : 'Локальний режим'}
                  </span>
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={onSyncRefresh}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Оновити дані"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
                  <span>{isSyncing ? 'Оновлення...' : 'Оновити'}</span>
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={onOpenIntegration}
                  className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                  title="Розширення Comic Tracker Bridge"
                >
                  <Globe className="w-3 h-3 text-zinc-500" />
                  <span id="extensionStatus" className="text-zinc-500">?</span>
                </button>
              </div>
            </div>
          </div>


          {/* Mobile Add Button shortcut */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={onOpenAddModal}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати</span>
            </button>
          </div>
        </div>

        {/* Center Search Input */}
        <div className="flex-1 max-w-md w-full relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Пошук за назвою, тегами, видавцем, нотатками..."
            className="w-full bg-[#141622] border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Actions & View Mode Controls */}
        <div className="flex items-center gap-2 justify-between md:justify-end">
          {/* View switcher: Compact, Detailed, Grid */}
          <div className="flex items-center bg-[#141622] border border-white/10 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => onViewModeChange('compact')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'compact'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Компактний вигляд"
            >
              <Rows className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('detailed')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'detailed'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Детальний вигляд"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Сітка обкладинок"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Random Picker "Що почитати?" */}
          <button
            type="button"
            onClick={onOpenRandomModal}
            className="px-3 py-2 rounded-lg bg-[#181a29] hover:bg-[#202336] text-zinc-300 hover:text-white border border-white/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Випадковий вибір коміксу"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Що почитати?</span>
          </button>

          {/* Google Sheets Modal Button */}
          <button
            type="button"
            onClick={onOpenSheetsModal}
            className="p-2 rounded-lg bg-[#181a29] hover:bg-[#202336] text-zinc-300 hover:text-white border border-white/10 text-xs font-medium flex items-center justify-center transition-colors cursor-pointer"
            title="Налаштування Google Sheets"
          >
            <Sheet className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Desktop Add Comic Button */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Додати комікс</span>
          </button>
        </div>
      </div>
    </header>
  );
};
