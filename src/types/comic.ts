export interface Comic {
  id: string;
  title: string;
  cover_url: string;
  series_url: string;
  reading_url: string;
  current_issue: string; // e.g. "5" or "12.1" or "спецвипуск"
  current_page: number | null; // e.g. 14
  total_issues: number | null; // e.g. 24
  publisher: string; // e.g. "Marvel Comics", "DC Comics"
  priority: string; // e.g. "3 Звичайний", "1 Обов'язково"
  priority_order: number; // 1 to 5
  status: string; // "Хочу прочитати" | "Читаю" | "Прочитано" | "Відкладено" | "Кинуто"
  tags: string[]; // max 5 tags
  folders?: string[]; // list of folder names or IDs
  note: string; // free text note
  source_domain: string; // e.g. "com-x.life", "batcave.biz"
  created_at: string; // ISO string
  updated_at: string; // ISO string
  progress_updated_at: string; // ISO string
  last_read_at: string | null; // ISO string
}

export interface Collection {
  id: string;
  name: string;
  comic_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface TagItem {
  id: string;
  name: string;
  created_at: string;
}

export interface PublisherItem {
  id: string;
  name: string;
  created_at: string;
}

export interface PriorityItem {
  id: string;
  name: string;
  description: string;
  sort_order: number;
}

export interface StatusItem {
  id: string;
  name: string;
  sort_order: number;
}

export interface SettingItem {
  key: string;
  value: string;
}

export type ViewMode = 'compact' | 'detailed' | 'grid';

export type SortOption =
  | 'priority_asc'
  | 'updated_desc'
  | 'created_desc'
  | 'title_asc'
  | 'title_desc'
  | 'progress_desc';

export interface FilterState {
  search: string;
  statuses: string[];
  priorities: string[];
  publishers: string[];
  tags: string[];
  sourceDomains: string[];
  // Backwards compatibility
  priority?: string;
  status?: string;
  publisher?: string;
  tag?: string;
  sourceDomain?: string;
}

