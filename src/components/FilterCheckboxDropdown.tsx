import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
  badgeDot?: string;
  badgeClass?: string;
}

interface FilterCheckboxDropdownProps {
  title: string;
  icon: React.ReactNode;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (newSelected: string[]) => void;
  defaultAllLabel: string;
  isStatusFilter?: boolean;
  onSelectAllExceptRead?: () => void;
  onSelectOnlyRead?: () => void;
  isAllExceptReadActive?: boolean;
  readStatusName?: string;
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onClose?: () => void;
}

export const FilterCheckboxDropdown: React.FC<FilterCheckboxDropdownProps> = ({
  title,
  icon,
  options,
  selectedValues,
  onChange,
  defaultAllLabel,
  isStatusFilter = false,
  onSelectAllExceptRead,
  onSelectOnlyRead,
  isAllExceptReadActive = false,
  readStatusName = 'Прочитано',
  isOpen: controlledIsOpen,
  onToggleOpen: controlledToggle,
  onClose: controlledClose,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const toggleDropdown = () => {
    if (isControlled && controlledToggle) {
      controlledToggle();
    } else {
      setInternalIsOpen((prev) => !prev);
    }
  };

  const closeDropdown = () => {
    if (isControlled && controlledClose) {
      controlledClose();
    } else {
      setInternalIsOpen(false);
    }
    setSearchQuery('');
  };

  // Close on click outside or escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleOption = (id: string) => {
    if (selectedValues.includes(id)) {
      onChange(selectedValues.filter((v) => v !== id));
    } else {
      onChange([...selectedValues, id]);
    }
  };

  const selectAll = () => {
    onChange(options.map((o) => o.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  // Filter options by search query if many
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Trigger button label
  const getButtonLabel = (): string => {
    if (isStatusFilter) {
      if (isAllExceptReadActive) {
        return 'Всі, крім прочитаних';
      }
      if (selectedValues.length === 0) {
        return 'Статуси не обрано';
      }
      if (selectedValues.length === options.length) {
        return 'Усі статуси';
      }
      if (selectedValues.length === 1) {
        const match = options.find((o) => o.id === selectedValues[0]);
        return match ? match.label : selectedValues[0];
      }
      return `Статуси (${selectedValues.length})`;
    }

    // Generic filters
    if (selectedValues.length === 0) {
      return defaultAllLabel;
    }
    if (selectedValues.length === options.length && options.length > 1) {
      return `Усі ${title.toLowerCase()}`;
    }
    if (selectedValues.length === 1) {
      const match = options.find((o) => o.id === selectedValues[0]);
      return match ? match.label : selectedValues[0];
    }
    return `${title} (${selectedValues.length})`;
  };

  const isFilterCustom = isStatusFilter
    ? !isAllExceptReadActive && selectedValues.length !== options.length
    : selectedValues.length > 0;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
          isOpen
            ? 'bg-[#1e2238] border-indigo-500/80 text-white shadow-sm ring-1 ring-indigo-500/30'
            : isFilterCustom
            ? 'bg-[#181a2b] border-indigo-500/40 text-indigo-300 hover:bg-[#1e2136]'
            : 'bg-[#181a29] border-white/10 text-zinc-300 hover:bg-[#1e2033] hover:text-white'
        }`}
        title={`Фільтр: ${title}`}
        aria-expanded={isOpen}
      >
        <span className="shrink-0">{icon}</span>
        <span className="max-w-[150px] sm:max-w-[180px] truncate">{getButtonLabel()}</span>

        {/* Selected count badge if multiple custom */}
        {selectedValues.length > 0 && !isAllExceptReadActive && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {selectedValues.length}
          </span>
        )}

        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-150 shrink-0 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 z-50 w-64 sm:w-72 rounded-xl bg-[#131522] border border-white/15 shadow-2xl p-2.5 text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-2">
          {/* Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
            <span className="font-semibold text-white tracking-tight flex items-center gap-1.5">
              <span>{title}</span>
              <span className="text-[10px] font-normal text-zinc-400">
                ({selectedValues.length} з {options.length})
              </span>
            </span>

            <button
              type="button"
              onClick={closeDropdown}
              className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Special Quick Actions for Status filter */}
          {isStatusFilter && onSelectAllExceptRead && onSelectOnlyRead && (
            <div className="flex flex-col gap-1 pb-1 border-b border-white/10">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={onSelectAllExceptRead}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-center transition-all cursor-pointer ${
                    isAllExceptReadActive
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-[#1a1d2e] text-zinc-300 border-white/10 hover:bg-[#22263d] hover:text-white'
                  }`}
                  title="Показувати всі статуси, крім прочитаних коміксів (стандартний режим)"
                >
                  ✓ Крім прочитаних
                </button>
                <button
                  type="button"
                  onClick={onSelectOnlyRead}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border text-center transition-all cursor-pointer ${
                    selectedValues.length === 1 && selectedValues[0] === readStatusName
                      ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                      : 'bg-[#1a1d2e] text-zinc-300 border-white/10 hover:bg-[#22263d] hover:text-white'
                  }`}
                  title="Показати тільки прочитані комікси"
                >
                  Тільки прочитані
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5 px-0.5">
                <button
                  type="button"
                  onClick={selectAll}
                  className="hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Вибрати всі
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Зняти всі
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions for Generic Filters */}
          {!isStatusFilter && (
            <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1 border-b border-white/10 px-0.5">
              <button
                type="button"
                onClick={selectAll}
                className="hover:text-indigo-400 transition-colors cursor-pointer"
              >
                Вибрати всі
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="hover:text-rose-400 transition-colors cursor-pointer"
              >
                Очистити
              </button>
            </div>
          )}

          {/* Search bar inside dropdown if > 5 items */}
          {options.length > 5 && (
            <div className="relative">
              <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Пошук у списку..."
                className="w-full bg-[#181a29] border border-white/10 rounded-lg pl-7 pr-7 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Options List with Checkboxes */}
          <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-zinc-500 text-[11px]">
                Нічого не знайдено
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleOption(opt.id)}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors select-none text-left ${
                      isChecked
                        ? 'bg-indigo-600/15 text-white'
                        : 'hover:bg-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Checkbox */}
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-white/20 bg-[#161826]'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[2.5]" />}
                      </div>

                      {/* Optional Dot for status */}
                      {opt.badgeDot && (
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${opt.badgeDot}`}
                        />
                      )}

                      {/* Label */}
                      <span className="truncate text-xs font-normal">
                        {opt.label}
                      </span>
                    </div>

                    {/* Count */}
                    {opt.count !== undefined && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full shrink-0 ${
                          isChecked
                            ? 'bg-indigo-500/20 text-indigo-200'
                            : 'bg-white/5 text-zinc-500'
                        }`}
                      >
                        {opt.count}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
