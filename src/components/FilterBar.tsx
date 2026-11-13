import React, { useState, useMemo } from 'react';
import {
  Filter,
  RotateCcw,
  ArrowUpDown,
  ChevronDown,
  Layers,
  Tag,
  Building,
  Flag,
  Globe,
} from 'lucide-react';
import {
  FilterState,
  SortOption,
  PublisherItem,
  PriorityItem,
  StatusItem,
  TagItem,
  Comic,
} from '../types/comic.ts';
import {
  FilterCheckboxDropdown,
  FilterOption,
} from './FilterCheckboxDropdown.tsx';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  publishers: PublisherItem[];
  priorities: PriorityItem[];
  statuses: StatusItem[];
  tags: TagItem[];
  sourceDomains: string[];
  totalResults: number;
  allComics?: Comic[];
  hasActiveFilters: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  sortOption,
  onSortChange,
  publishers,
  priorities,
  statuses,
  tags,
  sourceDomains,
  totalResults,
  allComics = [],
  hasActiveFilters,
}) => {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // Compute live comic counts per option for rich information density
  const counts = useMemo(() => {
    const statusMap: Record<string, number> = {};
    const priorityMap: Record<string, number> = {};
    const publisherMap: Record<string, number> = {};
    const tagMap: Record<string, number> = {};
    const domainMap: Record<string, number> = {};

    allComics.forEach((c) => {
      // Status
      if (c.status) {
        statusMap[c.status] = (statusMap[c.status] || 0) + 1;
      }
      // Priority
      if (c.priority) {
        priorityMap[c.priority] = (priorityMap[c.priority] || 0) + 1;
      }
      // Publisher
      if (c.publisher) {
        publisherMap[c.publisher] = (publisherMap[c.publisher] || 0) + 1;
      }
      // Tags
      (c.tags || []).forEach((t) => {
        if (t) tagMap[t] = (tagMap[t] || 0) + 1;
      });
      // Source Domain
      if (c.source_domain) {
        domainMap[c.source_domain] = (domainMap[c.source_domain] || 0) + 1;
      }
    });

    return { statusMap, priorityMap, publisherMap, tagMap, domainMap };
  }, [allComics]);

  // Status Options with colored dots
  const statusOptions: FilterOption[] = useMemo(() => {
    return statuses.map((s) => {
      let badgeDot = 'bg-zinc-400';
      if (s.name === 'Читаю') badgeDot = 'bg-emerald-400';
      else if (s.name === 'Хочу прочитати') badgeDot = 'bg-indigo-400';
      else if (s.name === 'Прочитано') badgeDot = 'bg-teal-400';
      else if (s.name === 'Відкладено') badgeDot = 'bg-amber-400';
      else if (s.name === 'Кинуто') badgeDot = 'bg-zinc-500';

      return {
        id: s.name,
        label: s.name,
        count: counts.statusMap[s.name] || 0,
        badgeDot,
      };
    });
  }, [statuses, counts.statusMap]);

  // Priority Options with order indicator
  const priorityOptions: FilterOption[] = useMemo(() => {
    return priorities.map((p) => {
      let badgeDot = 'bg-purple-400';
      if (p.sort_order === 1 || p.name.includes('1')) badgeDot = 'bg-rose-500';
      else if (p.sort_order === 2 || p.name.includes('2')) badgeDot = 'bg-amber-500';
      else if (p.sort_order === 3 || p.name.includes('3')) badgeDot = 'bg-sky-500';
      else if (p.sort_order === 4 || p.name.includes('4')) badgeDot = 'bg-slate-400';

      return {
        id: p.name,
        label: p.name,
        count: counts.priorityMap[p.name] || 0,
        badgeDot,
      };
    });
  }, [priorities, counts.priorityMap]);

  // Publisher Options
  const publisherOptions: FilterOption[] = useMemo(() => {
    return publishers.map((pub) => ({
      id: pub.name,
      label: pub.name,
      count: counts.publisherMap[pub.name] || 0,
    }));
  }, [publishers, counts.publisherMap]);

  // Tag Options
  const tagOptions: FilterOption[] = useMemo(() => {
    return tags.map((t) => ({
      id: t.name,
      label: `#${t.name}`,
      count: counts.tagMap[t.name] || 0,
    }));
  }, [tags, counts.tagMap]);

  // Source Domain Options
  const domainOptions: FilterOption[] = useMemo(() => {
    return sourceDomains.map((d) => ({
      id: d,
      label: d,
      count: counts.domainMap[d] || 0,
    }));
  }, [sourceDomains, counts.domainMap]);

  // Check if current status filter is exactly "all except read"
  const defaultNonReadStatuses = useMemo(() => {
    const list = statuses.map((s) => s.name).filter((n) => n !== 'Прочитано');
    return list.length > 0 ? list : ['Хочу прочитати', 'Читаю', 'Відкладено', 'Кинуто'];
  }, [statuses]);

  const isAllExceptReadActive = useMemo(() => {
    if (!filters.statuses) return false;
    if (filters.statuses.length !== defaultNonReadStatuses.length) return false;
    const hasRead = filters.statuses.includes('Прочитано');
    return !hasRead && defaultNonReadStatuses.every((n) => filters.statuses.includes(n));
  }, [filters.statuses, defaultNonReadStatuses]);

  const handleSelectAllExceptRead = () => {
    onFilterChange({
      ...filters,
      statuses: [...defaultNonReadStatuses],
    });
  };

  const handleSelectOnlyRead = () => {
    onFilterChange({
      ...filters,
      statuses: ['Прочитано'],
    });
  };

  return (
    <div className="bg-[#11131c] border-b border-white/10 px-4 lg:px-8 py-2.5 text-xs text-zinc-300">
      <div className="w-full max-w-full mx-auto flex flex-col gap-2.5">
        {/* Top row: Results count, active toggle on mobile, Sorting */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileExpanded(!mobileExpanded)}
              className="md:hidden flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#181a29] border border-white/10 text-zinc-200 cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>Фільтри (чекбокси)</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${
                  mobileExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            <span className="text-zinc-400 font-medium whitespace-nowrap">
              Знайдено:{' '}
              <span className="text-white font-bold">{totalResults}</span>{' '}
              {totalResults === 1
                ? 'комікс'
                : totalResults > 1 && totalResults < 5
                ? 'комікси'
                : 'коміксів'}
            </span>

            {/* Indicator showing read comics are hidden by default */}
            {isAllExceptReadActive && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>Прочитані приховано</span>
              </span>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/20 transition-colors cursor-pointer whitespace-nowrap text-xs"
                title="Скинути всі активні фільтри до стандартних"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Скинути фільтри</span>
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-400 hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>Сортування:</span>
            </span>
            <select
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="bg-[#181a29] border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="priority_asc">За пріоритетом (1 → 5)</option>
              <option value="updated_desc">Нещодавно оновлені</option>
              <option value="created_desc">Нещодавно додані</option>
              <option value="title_asc">Назва (А → Я)</option>
              <option value="title_desc">Назва (Я → А)</option>
              <option value="progress_desc">За прогресом (випуски)</option>
            </select>
          </div>
        </div>

        {/* Filter Checkbox Dropdowns row (Always visible on desktop, toggleable on mobile) */}
        <div
          className={`${
            mobileExpanded ? 'flex' : 'hidden md:flex'
          } flex-wrap items-center gap-2 pt-0.5`}
        >
          {/* Status Filter (Multi-select Checkboxes with "Except Read" default) */}
          <FilterCheckboxDropdown
            title="Статус"
            icon={<Layers className="w-3.5 h-3.5 text-indigo-400" />}
            options={statusOptions}
            selectedValues={filters.statuses || []}
            onChange={(selected) => onFilterChange({ ...filters, statuses: selected })}
            defaultAllLabel="Всі статуси"
            isStatusFilter={true}
            onSelectAllExceptRead={handleSelectAllExceptRead}
            onSelectOnlyRead={handleSelectOnlyRead}
            isAllExceptReadActive={isAllExceptReadActive}
            readStatusName="Прочитано"
          />

          {/* Priority Filter (Multi-select Checkboxes) */}
          <FilterCheckboxDropdown
            title="Пріоритет"
            icon={<Flag className="w-3.5 h-3.5 text-amber-400" />}
            options={priorityOptions}
            selectedValues={filters.priorities || []}
            onChange={(selected) => onFilterChange({ ...filters, priorities: selected })}
            defaultAllLabel="Всі пріоритети"
          />

          {/* Publisher Filter (Multi-select Checkboxes) */}
          <FilterCheckboxDropdown
            title="Видавництво"
            icon={<Building className="w-3.5 h-3.5 text-sky-400" />}
            options={publisherOptions}
            selectedValues={filters.publishers || []}
            onChange={(selected) => onFilterChange({ ...filters, publishers: selected })}
            defaultAllLabel="Усі видавництва"
          />

          {/* Tag Filter (Multi-select Checkboxes) */}
          <FilterCheckboxDropdown
            title="Теги"
            icon={<Tag className="w-3.5 h-3.5 text-emerald-400" />}
            options={tagOptions}
            selectedValues={filters.tags || []}
            onChange={(selected) => onFilterChange({ ...filters, tags: selected })}
            defaultAllLabel="Всі теги"
          />

          {/* Source Domain Filter (Multi-select Checkboxes) */}
          {domainOptions.length > 0 && (
            <FilterCheckboxDropdown
              title="Сайти / Джерела"
              icon={<Globe className="w-3.5 h-3.5 text-purple-400" />}
              options={domainOptions}
              selectedValues={filters.sourceDomains || []}
              onChange={(selected) => onFilterChange({ ...filters, sourceDomains: selected })}
              defaultAllLabel="Усі сайти"
            />
          )}

          {/* Quick Guidance Tag */}
          <div className="text-[10px] text-zinc-500 bg-[#181a29]/60 border border-white/5 rounded-lg px-2.5 py-1.5 ml-auto hidden xl:block">
            Клікніть на фільтр, щоб вибрати потрібні статуси, пріоритети або видавництва за допомогою чекбоксів.
          </div>
        </div>
      </div>
    </div>
  );
};
