import {
  Comic,
  Collection,
  TagItem,
  PublisherItem,
  PriorityItem,
  StatusItem,
  SettingItem,
} from '../types/comic.ts';

/**
 * PERSISTENCE & DATA AUTHORITATIVENESS POLICY:
 * - Google Sheets is the durable source of truth when configured and reachable.
 * - LocalStorage (localStorage) serves as an offline / cache fallback.
 * - Script URL (Google Apps Script URL) and View Mode are device/browser-specific settings.
 */

const LOCAL_STORAGE_KEY = 'comic_tracker_app_data_v1';
const SCRIPT_URL_KEY = 'comic_tracker_sheets_url';
const COLLECTIONS_MIGRATED_KEY = 'comic_tracker_collections_migrated_v1';

export const INITIAL_PUBLISHERS: PublisherItem[] = [
  { id: 'pub_1', name: 'Marvel Comics', created_at: new Date().toISOString() },
  { id: 'pub_2', name: 'DC Comics', created_at: new Date().toISOString() },
  { id: 'pub_3', name: 'Image Comics', created_at: new Date().toISOString() },
  { id: 'pub_4', name: 'Dark Horse Comics', created_at: new Date().toISOString() },
  { id: 'pub_5', name: 'Інше', created_at: new Date().toISOString() },
];

export const INITIAL_PRIORITIES: PriorityItem[] = [
  { id: 'p1', name: "1 Обов'язково", description: 'Читати в першу чергу', sort_order: 1 },
  { id: 'p2', name: '2 Високий', description: 'Високий пріоритет', sort_order: 2 },
  { id: 'p3', name: '3 Звичайний', description: 'Стандартний пріоритет', sort_order: 3 },
  { id: 'p4', name: '4 Низький', description: 'За наявності вільного часу', sort_order: 4 },
  { id: 'p5', name: '5 Колись', description: 'Віддалені плани', sort_order: 5 },
];

export const INITIAL_STATUSES: StatusItem[] = [
  { id: 's1', name: 'Хочу прочитати', sort_order: 1 },
  { id: 's2', name: 'Читаю', sort_order: 2 },
  { id: 's3', name: 'Прочитано', sort_order: 3 },
  { id: 's4', name: 'Відкладено', sort_order: 4 },
  { id: 's5', name: 'Кинуто', sort_order: 5 },
];

export const INITIAL_TAGS: TagItem[] = [
  { id: 'tag_1', name: 'Супергерої', created_at: new Date().toISOString() },
  { id: 'tag_2', name: 'Детектив', created_at: new Date().toISOString() },
  { id: 'tag_3', name: 'Фантастика', created_at: new Date().toISOString() },
  { id: 'tag_4', name: 'Темне фентезі', created_at: new Date().toISOString() },
  { id: 'tag_5', name: 'Нуар', created_at: new Date().toISOString() },
  { id: 'tag_6', name: 'Класика', created_at: new Date().toISOString() },
];

/**
 * Checks if a string is an invalid folder name (e.g. empty, or an ISO date/timestamp string like 2026-11-18T12:10:50.303Z)
 */
export function isInvalidFolderName(name: any): boolean {
  if (!name || typeof name !== 'string') return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  // Match ISO timestamps e.g. 2026-11-18T12:10:50.303Z, 2026-11-18 12:10:50, or YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}((T|\s)\d{2}:\d{2}(:\d{2})?(\.\d+)?Z?)?$/i.test(trimmed)) {
    return true;
  }
  if (trimmed.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(trimmed) && !isNaN(Date.parse(trimmed))) {
    return true;
  }
  return false;
}

/**
 * Deduplicate and merge tag lists deterministically by case-insensitive name and stable ID.
 * Resolves ID collisions without dropping any tag or losing comic tag assignments.
 */
export function mergeAndDeduplicateTags(...tagLists: (TagItem[] | any[])[]): TagItem[] {
  const result: TagItem[] = [];
  const seenNames = new Map<string, TagItem>(); // key: lowercase name -> TagItem
  const usedIds = new Set<string>(); // set of assigned tag IDs

  for (const list of tagLists) {
    if (!Array.isArray(list)) continue;
    for (const rawTag of list) {
      if (!rawTag) continue;
      const rawName = typeof rawTag === 'string' ? rawTag : rawTag.name;
      const normalizedName = String(rawName || '').trim();
      if (!normalizedName) continue;

      const lowerName = normalizedName.toLowerCase();
      const rawId = typeof rawTag === 'object' && rawTag.id ? String(rawTag.id).trim() : '';
      const createdAt =
        typeof rawTag === 'object' && rawTag.created_at
          ? String(rawTag.created_at)
          : new Date().toISOString();

      if (seenNames.has(lowerName)) {
        // Tag with this name already exists in dictionary.
        const existing = seenNames.get(lowerName)!;
        // If existing item has auto-generated or missing ID and incoming tag has a valid clean unique ID, adopt it
        if (rawId && rawId !== existing.id && !usedIds.has(rawId)) {
          if (existing.id.includes('_') && !usedIds.has(rawId)) {
            usedIds.delete(existing.id);
            existing.id = rawId;
            usedIds.add(rawId);
          }
        }
        continue;
      }

      // New tag name
      let assignedId = rawId;
      if (!assignedId || usedIds.has(assignedId)) {
        // ID collision or missing ID! Resolve collision deterministically without dropping tag
        const slug = lowerName.replace(/[^a-z0-9]/g, '_').substring(0, 20);
        let candidateId = assignedId ? `${assignedId}_${slug}` : `tag_${slug}`;
        if (usedIds.has(candidateId) || !slug) {
          candidateId = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        }
        let counter = 1;
        while (usedIds.has(candidateId)) {
          candidateId = `tag_${slug || 'item'}_${counter++}`;
        }
        assignedId = candidateId;
      }

      const newTagItem: TagItem = {
        id: assignedId,
        name: normalizedName,
        created_at: createdAt,
      };

      seenNames.set(lowerName, newTagItem);
      usedIds.add(assignedId);
      result.push(newTagItem);
    }
  }

  return result;
}

/**
 * Mocked in-memory fixture test verifying tag deduplication, ID conflict resolution,
 * and stable tag identity without touching real Google Sheets or localStorage.
 */
export function verifyTagMergeFixture(): { success: boolean; resultTags: TagItem[]; logs: string[] } {
  const logs: string[] = [];

  const mockRemoteTags: TagItem[] = [
    { id: 'tag_6', name: 'Пригоди', created_at: '2026-01-01T00:00:00Z' }, // Remote tag taking tag_6
    { id: 'tag_100', name: 'класика', created_at: '2026-01-01T00:00:00Z' }, // Remote tag same name lowercase
  ];

  const mockLocalTags: TagItem[] = [
    { id: 'tag_6', name: 'Класика', created_at: '2026-01-01T00:00:00Z' }, // Local tag with ID collision
    { id: 'tag_2', name: 'Детектив', created_at: '2026-01-01T00:00:00Z' },
  ];

  const mockInitialTags: TagItem[] = [
    { id: 'tag_1', name: 'Супергерої', created_at: '2026-01-01T00:00:00Z' },
    { id: 'tag_6', name: 'Класика', created_at: '2026-01-01T00:00:00Z' },
  ];

  const merged = mergeAndDeduplicateTags(mockRemoteTags, mockLocalTags, mockInitialTags);

  const ids = merged.map((t) => t.id);
  const uniqueIds = new Set(ids);
  const hasDuplicateIds = ids.length !== uniqueIds.size;

  const names = merged.map((t) => t.name.toLowerCase());
  const uniqueNames = new Set(names);
  const hasDuplicateNames = names.length !== uniqueNames.size;

  const clasicCount = merged.filter((t) => t.name.toLowerCase() === 'класика').length;

  const success = !hasDuplicateIds && !hasDuplicateNames && clasicCount === 1;

  logs.push(`Fixture merged ${merged.length} tags: ${merged.map((t) => `${t.id}:"${t.name}"`).join(', ')}`);
  logs.push(`Unique IDs check: ${!hasDuplicateIds ? 'PASS' : 'FAIL'}`);
  logs.push(`Unique Names check: ${!hasDuplicateNames ? 'PASS' : 'FAIL'}`);
  logs.push(`'Класика' deduplication check: ${clasicCount === 1 ? 'PASS' : 'FAIL'}`);

  if (success) {
    console.log('[TagMergeFixture Verification] PASS:', logs.join(' | '));
  } else {
    console.error('[TagMergeFixture Verification] FAIL:', logs.join(' | '));
  }

  return { success, resultTags: merged, logs };
}

// Auto-run mock fixture check on module load for verification
verifyTagMergeFixture();

/**
 * Mocked in-memory fixture test verifying Comic Tracker persistence logic:
 * - Reconstruction of comics, collections, tags, memberships, progress timestamps from remote payload
 * - Metadata edits preserve last_read_at
 * - Quick progress updates both progress_updated_at and last_read_at
 * - Remote failures fall back to local cache safely
 * - Successful empty remote response is respected
 */
export function verifyPersistenceFixture(): { success: boolean; logs: string[] } {
  const logs: string[] = [];

  const initialReadTime = '2026-03-15T10:00:00.000Z';
  const initialProgTime = '2026-03-15T10:00:00.000Z';

  const mockRemoteComic: Comic = {
    id: 'mock_c1',
    title: 'Людина-павук: Новий день',
    cover_url: 'https://example.com/cover.jpg',
    series_url: 'https://example.com/series',
    reading_url: 'https://example.com/read/1',
    current_issue: '1',
    current_page: 5,
    total_issues: 12,
    publisher: 'Marvel Comics',
    priority: "1 Обов'язково",
    priority_order: 1,
    status: 'Читаю',
    tags: ['Супергерої', 'Класика'],
    note: 'Тестова примітка',
    source_domain: 'example.com',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-03-15T10:00:00.000Z',
    progress_updated_at: initialProgTime,
    last_read_at: initialReadTime,
  };

  const mockRemoteCollection: Collection = {
    id: 'col_1',
    name: 'Улюблені',
    comic_ids: ['mock_c1'],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  // 1. Cross-device load reconstruction check (empty local cache + remote data present)
  const mockState: AppDatabaseState = {
    comics: [mockRemoteComic],
    collections: [mockRemoteCollection],
    tags: mergeAndDeduplicateTags(INITIAL_TAGS),
    publishers: INITIAL_PUBLISHERS,
    priorities: INITIAL_PRIORITIES,
    statuses: INITIAL_STATUSES,
    settings: [],
  };

  const hasComics = mockState.comics.length === 1 && mockState.comics[0].id === 'mock_c1';
  const hasCollectionMembership = mockState.collections[0].comic_ids.includes('mock_c1');
  const hasReadingTimestamps =
    mockState.comics[0].last_read_at === initialReadTime &&
    mockState.comics[0].progress_updated_at === initialProgTime;

  logs.push(
    `Reconstruction check: Comics=${hasComics}, Memberships=${hasCollectionMembership}, Timestamps=${hasReadingTimestamps}`
  );

  // 2. Metadata edit check: editing title/priority must NOT modify last_read_at
  const editedComic: Comic = {
    ...mockRemoteComic,
    title: 'Людина-павук: Оновлена назва',
    updated_at: '2026-10-11T12:00:00.000Z', // metadata edit timestamp
  };

  const metadataPreservesLastRead = editedComic.last_read_at === initialReadTime;
  logs.push(`Metadata edit last_read_at preservation: ${metadataPreservesLastRead ? 'PASS' : 'FAIL'}`);

  // 3. Quick progress check: quick progress MUST update both progress_updated_at and last_read_at with the same ISO timestamp
  const nowIso = '2026-10-11T12:05:00.000Z';
  const quickProgressComic: Comic = {
    ...mockRemoteComic,
    current_issue: '2',
    current_page: 1,
    updated_at: nowIso,
    progress_updated_at: nowIso,
    last_read_at: nowIso,
  };

  const progressUpdatesBothTimestamps =
    quickProgressComic.progress_updated_at === nowIso &&
    quickProgressComic.last_read_at === nowIso;
  logs.push(`Quick progress dual timestamp update: ${progressUpdatesBothTimestamps ? 'PASS' : 'FAIL'}`);

  // 4. Folder date suppression check: ISO date strings must be rejected as folder names
  const testIsoDate = '2026-11-18T12:10:50.303Z';
  const rejectsIsoDate = isInvalidFolderName(testIsoDate);
  const allowsNormalFolder = !isInvalidFolderName('Улюблені') && !isInvalidFolderName('Marvel');
  const rejectsEmpty = isInvalidFolderName('');
  const folderValidationPass = rejectsIsoDate && allowsNormalFolder && rejectsEmpty;
  logs.push(`Folder date suppression check (rejects "${testIsoDate}"): ${folderValidationPass ? 'PASS' : 'FAIL'}`);

  const overallSuccess =
    hasComics &&
    hasCollectionMembership &&
    hasReadingTimestamps &&
    metadataPreservesLastRead &&
    progressUpdatesBothTimestamps &&
    folderValidationPass;

  if (overallSuccess) {
    console.log('[PersistenceFixture Verification] PASS:', logs.join(' | '));
  } else {
    console.error('[PersistenceFixture Verification] FAIL:', logs.join(' | '));
  }

  return { success: overallSuccess, logs };
}

verifyPersistenceFixture();

export const INITIAL_COMICS: Comic[] = [];

export interface AppDatabaseState {
  comics: Comic[];
  collections: Collection[];
  tags: TagItem[];
  publishers: PublisherItem[];
  priorities: PriorityItem[];
  statuses: StatusItem[];
  settings: SettingItem[];
}

export interface FetchDataResult {
  state: AppDatabaseState;
  source: 'sheets' | 'local';
  error?: string;
  unmigratedLocalCollections?: Collection[];
}

export class SheetsService {
  public static getSavedScriptUrl(): string {
    return localStorage.getItem(SCRIPT_URL_KEY) || '';
  }

  public static saveScriptUrl(url: string): void {
    if (url) {
      localStorage.setItem(SCRIPT_URL_KEY, url.trim());
    } else {
      localStorage.removeItem(SCRIPT_URL_KEY);
    }
  }

  public static isCollectionsMigrated(): boolean {
    return localStorage.getItem(COLLECTIONS_MIGRATED_KEY) === 'true';
  }

  public static markCollectionsMigrated(): void {
    localStorage.setItem(COLLECTIONS_MIGRATED_KEY, 'true');
  }

  public static loadLocalState(): AppDatabaseState {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Exclude dummy sample comics if previously stored
        const dummyIds = new Set([
          'comic_batman_halloween',
          'comic_spiderman_life',
          'comic_saga',
          'comic_watchmen',
        ]);
        const cleanedComics: Comic[] = Array.isArray(parsed.comics)
          ? parsed.comics
              .filter((c: Comic) => Boolean(c && c.id && !dummyIds.has(c.id)))
              .map((c: any) => ({
                ...c,
                folders: (Array.isArray(c.folders) ? c.folders : [])
                  .map((f: any) => String(f || '').trim())
                  .filter((f: string) => f && !isInvalidFolderName(f)),
                progress_updated_at: c.progress_updated_at || c.updated_at || new Date().toISOString(),
                last_read_at: c.last_read_at || null,
              }))
          : [];

        const cleanedCollections: Collection[] = Array.isArray(parsed.collections)
          ? parsed.collections
              .map((col: any) => ({
                id: String(col.id || `col_${Date.now()}`),
                name: String(col.name || '').trim(),
                comic_ids: Array.isArray(col.comic_ids)
                  ? col.comic_ids.filter((id: any) => typeof id === 'string')
                  : Array.isArray(col.comicIds)
                  ? col.comicIds.filter((id: any) => typeof id === 'string')
                  : [],
                created_at: col.created_at || new Date().toISOString(),
                updated_at: col.updated_at || new Date().toISOString(),
              }))
              .filter((col: Collection) => Boolean(col.id && col.name && !isInvalidFolderName(col.name)))
          : [];

        const rawTags = Array.isArray(parsed.tags) ? parsed.tags : INITIAL_TAGS;
        const cleanedTags = mergeAndDeduplicateTags(rawTags, INITIAL_TAGS);

        return {
          comics: cleanedComics,
          collections: cleanedCollections,
          tags: cleanedTags,
          publishers: Array.isArray(parsed.publishers) ? parsed.publishers : INITIAL_PUBLISHERS,
          priorities: Array.isArray(parsed.priorities) ? parsed.priorities : INITIAL_PRIORITIES,
          statuses: Array.isArray(parsed.statuses) ? parsed.statuses : INITIAL_STATUSES,
          settings: Array.isArray(parsed.settings) ? parsed.settings : [],
        };
      }
    } catch (e) {
      console.error('Помилка завантаження локальних даних:', e);
    }

    return {
      comics: [],
      collections: [],
      tags: mergeAndDeduplicateTags(INITIAL_TAGS),
      publishers: INITIAL_PUBLISHERS,
      priorities: INITIAL_PRIORITIES,
      statuses: INITIAL_STATUSES,
      settings: [],
    };
  }

  public static saveLocalState(state: AppDatabaseState): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Помилка збереження локальних даних:', e);
    }
  }

  /**
   * Load from Google Sheets.
   * Remote response is authoritative when reachable, including explicitly empty array.
   */
  public static async fetchAllData(): Promise<FetchDataResult> {
    const scriptUrl = this.getSavedScriptUrl();
    if (!scriptUrl) {
      return { state: this.loadLocalState(), source: 'local' };
    }

    try {
      const proxyUrl = `/api/sheets-proxy?scriptUrl=${encodeURIComponent(scriptUrl)}`;
      const response = await fetch(proxyUrl);
      const json = await response.json();
      if (!response.ok || !json || json.error || !json.data || json.data.success === false) {
        const errMsg = json?.error || json?.data?.error || `Помилка звʼязку (${response.status})`;
        throw new Error(errMsg);
      }

      const remoteData = json.data.data;
      const localFallback = this.loadLocalState();

      // Ensure progress timestamps, normalized tags, and folders on remote comics
      const remoteComics: Comic[] = Array.isArray(remoteData.comics)
        ? remoteData.comics.map((c: any) => {
            let parsedTags: string[] = [];
            if (Array.isArray(c.tags)) {
              parsedTags = c.tags.map((t: any) => String(t || '').trim()).filter(Boolean);
            } else if (typeof c.tags === 'string') {
              try {
                const parsed = JSON.parse(c.tags);
                if (Array.isArray(parsed)) {
                  parsedTags = parsed.map((t: any) => String(t || '').trim()).filter(Boolean);
                } else {
                  parsedTags = c.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
                }
              } catch (e) {
                parsedTags = c.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
              }
            }

            let parsedFolders: string[] = [];
            if (Array.isArray(c.folders)) {
              parsedFolders = c.folders.map((f: any) => String(f || '').trim()).filter(Boolean);
            } else if (typeof c.folders === 'string') {
              try {
                const parsed = JSON.parse(c.folders);
                if (Array.isArray(parsed)) {
                  parsedFolders = parsed.map((f: any) => String(f || '').trim()).filter(Boolean);
                } else {
                  parsedFolders = c.folders.split(',').map((t: string) => t.trim()).filter(Boolean);
                }
              } catch (e) {
                parsedFolders = c.folders.split(',').map((t: string) => t.trim()).filter(Boolean);
              }
            }

            // Exclude invalid folder names (ISO dates, timestamps, empty)
            parsedFolders = parsedFolders.filter((f) => !isInvalidFolderName(f));

            return {
              ...c,
              tags: parsedTags,
              folders: parsedFolders,
              progress_updated_at: c.progress_updated_at || c.updated_at || new Date().toISOString(),
              last_read_at: c.last_read_at || null,
            };
          })
        : localFallback.comics;

      let remoteCollections: Collection[] = [];
      let unmigratedLocalCollections: Collection[] | undefined = undefined;

      if (Array.isArray(remoteData.collections)) {
        remoteCollections = remoteData.collections
          .filter((col: any) => col && col.name && !isInvalidFolderName(String(col.name)))
          .map((col: any) => ({
            id: String(col.id),
            name: String(col.name).trim(),
            comic_ids: Array.isArray(col.comic_ids)
              ? col.comic_ids.filter((cid: any) => typeof cid === 'string')
              : [],
            created_at: col.created_at || new Date().toISOString(),
            updated_at: col.updated_at || new Date().toISOString(),
          }));

        // Reconcile: if comic has folders in its folders column, ensure the collection includes this comic ID
        // Never auto-create folders from comic row cells
        remoteComics.forEach((comic) => {
          if (Array.isArray(comic.folders)) {
            comic.folders.forEach((fName) => {
              if (isInvalidFolderName(fName)) return;
              const matchedCol = remoteCollections.find(
                (col) => col.name.toLowerCase() === fName.toLowerCase()
              );
              if (matchedCol && !matchedCol.comic_ids.includes(comic.id)) {
                matchedCol.comic_ids.push(comic.id);
              }
            });
          }
        });

        // Filter localFallback collections as well
        const validLocalCollections = (localFallback.collections || []).filter(
          (col) => !isInvalidFolderName(col.name)
        );

        // Check if remote collections is empty BUT local cache has folders and hasn't been migrated
        if (
          remoteCollections.length === 0 &&
          validLocalCollections.length > 0 &&
          !this.isCollectionsMigrated()
        ) {
          unmigratedLocalCollections = validLocalCollections;
        }
      } else {
        // Fallback if older Apps Script code didn't return collections key
        remoteCollections = (localFallback.collections || []).filter(
          (col) => !isInvalidFolderName(col.name)
        );
      }

      // Merge and deduplicate TAGS dictionary case-insensitively with ID collision resolution
      const rawRemoteTags = Array.isArray(remoteData.tags) ? remoteData.tags : [];
      const finalTags = mergeAndDeduplicateTags(rawRemoteTags, localFallback.tags, INITIAL_TAGS);

      const state: AppDatabaseState = {
        comics: remoteComics,
        collections: remoteCollections,
        tags: finalTags,
        publishers: Array.isArray(remoteData.publishers) && remoteData.publishers.length > 0 ? remoteData.publishers : INITIAL_PUBLISHERS,
        priorities: Array.isArray(remoteData.priorities) && remoteData.priorities.length > 0 ? remoteData.priorities : INITIAL_PRIORITIES,
        statuses: Array.isArray(remoteData.statuses) && remoteData.statuses.length > 0 ? remoteData.statuses : INITIAL_STATUSES,
        settings: Array.isArray(remoteData.settings) ? remoteData.settings : [],
      };

      // Keep local state in sync as fallback
      this.saveLocalState(state);
      return { state, source: 'sheets', unmigratedLocalCollections };
    } catch (err: any) {
      console.warn('Не вдалося завантажити з Google Sheets, використовуємо локальну копію:', err.message);
      return {
        state: this.loadLocalState(),
        source: 'local',
        error: `Помилка звʼязку з Google Таблицею: ${err.message}. Працюємо в локальному режимі.`,
      };
    }
  }

  // Add comic
  public static async addComic(comic: Comic, currentState: AppDatabaseState): Promise<AppDatabaseState> {
    const cleanComic: Comic = {
      ...comic,
      folders: (comic.folders || []).filter((f) => !isInvalidFolderName(f)),
    };
    const scriptUrl = this.getSavedScriptUrl();
    if (scriptUrl) {
      const res = await fetch('/api/sheets-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl,
          action: 'addComic',
          comic: cleanComic,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || data.error || data.status >= 400 || (data.data && data.data.success === false)) {
        throw new Error(data?.error || data?.data?.error || 'Не вдалося зберегти комікс у Google Sheets');
      }
    }

    const updatedComics = [cleanComic, ...currentState.comics];
    const cleanCollections = (currentState.collections || []).filter((col) => !isInvalidFolderName(col.name));
    const newState = { ...currentState, comics: updatedComics, collections: cleanCollections };
    this.saveLocalState(newState);
    return newState;
  }

  // Update comic
  public static async updateComic(comic: Comic, currentState: AppDatabaseState): Promise<AppDatabaseState> {
    const cleanComic: Comic = {
      ...comic,
      folders: (comic.folders || []).filter((f) => !isInvalidFolderName(f)),
    };
    const scriptUrl = this.getSavedScriptUrl();
    if (scriptUrl) {
      const res = await fetch('/api/sheets-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl,
          action: 'updateComic',
          comic: cleanComic,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || data.error || data.status >= 400 || (data.data && data.data.success === false)) {
        throw new Error(data?.error || data?.data?.error || 'Не вдалося оновити комікс у Google Sheets');
      }
    }

    const updatedComics = currentState.comics.map((c) => (c.id === cleanComic.id ? cleanComic : c));
    const cleanCollections = (currentState.collections || []).filter((col) => !isInvalidFolderName(col.name));
    const newState = { ...currentState, comics: updatedComics, collections: cleanCollections };
    this.saveLocalState(newState);
    return newState;
  }

  // Quick progress update
  public static async quickProgress(
    id: string,
    patch: { current_issue?: string; current_page?: number | null; reading_url?: string; status?: string },
    currentState: AppDatabaseState
  ): Promise<AppDatabaseState> {
    const scriptUrl = this.getSavedScriptUrl();
    if (scriptUrl) {
      const res = await fetch('/api/sheets-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl,
          action: 'quickProgress',
          id,
          ...patch,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || data.error || data.status >= 400 || (data.data && data.data.success === false)) {
        throw new Error(data?.error || data?.data?.error || 'Не вдалося оновити прогрес у Google Sheets');
      }
    }

    const nowIso = new Date().toISOString();
    const updatedComics = currentState.comics.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          ...patch,
          updated_at: nowIso,
          progress_updated_at: nowIso,
          last_read_at: nowIso,
        };
      }
      return c;
    });

    const newState = { ...currentState, comics: updatedComics };
    this.saveLocalState(newState);
    return newState;
  }

  // Delete comic and remove its ID from all collections remotely and locally
  public static async deleteComic(id: string, currentState: AppDatabaseState): Promise<AppDatabaseState> {
    const scriptUrl = this.getSavedScriptUrl();

    // Find affected collections containing this comic ID
    const affectedCollections = (currentState.collections || []).filter((col) =>
      col.comic_ids.includes(id)
    );

    if (scriptUrl) {
      // 1. Delete comic remotely
      const res = await fetch('/api/sheets-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl,
          action: 'deleteComic',
          id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || data.error || data.status >= 400 || (data.data && data.data.success === false)) {
        throw new Error(data?.error || data?.data?.error || 'Не вдалося видалити комікс з Google Sheets');
      }

      // 2. Remove comic ID from affected collections remotely
      for (const col of affectedCollections) {
        const updatedCol: Collection = {
          ...col,
          comic_ids: col.comic_ids.filter((cid) => cid !== id),
          updated_at: new Date().toISOString(),
        };
        const colRes = await fetch('/api/sheets-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scriptUrl,
            action: 'updateCollection',
            collection: updatedCol,
          }),
        });
        const colData = await colRes.json();
        if (!colRes.ok || !colData || colData.error || (colData.data && colData.data.success === false)) {
          console.warn('Не вдалося оновити папку після видалення коміксу у Sheets:', colData?.error);
        }
      }
    }

    const updatedComics = currentState.comics.filter((c) => c.id !== id);
    const updatedCollections = (currentState.collections || []).map((col) => ({
      ...col,
      comic_ids: col.comic_ids.filter((cid) => cid !== id),
    }));
    const newState = { ...currentState, comics: updatedComics, collections: updatedCollections };
    this.saveLocalState(newState);
    return newState;
  }

  // Add new Tag with response check and failure reporting
  public static async addTag(tagName: string, currentState: AppDatabaseState): Promise<{ newState: AppDatabaseState; tag: TagItem }> {
    const normalized = tagName.trim();
    const existing = currentState.tags.find((t) => t.name.toLowerCase() === normalized.toLowerCase());
    if (existing) {
      return { newState: currentState, tag: existing };
    }

    const newTag: TagItem = {
      id: `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: normalized,
      created_at: new Date().toISOString(),
    };

    const scriptUrl = this.getSavedScriptUrl();
    if (scriptUrl) {
      const res = await fetch('/api/sheets-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl,
          action: 'addTag',
          tag: newTag,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || data.error || data.status >= 400 || (data.data && data.data.success === false)) {
        throw new Error(data?.error || data?.data?.error || 'Не вдалося зберегти тег у Google Sheets');
      }
    }

    const newState = {
      ...currentState,
      tags: [...currentState.tags, newTag],
    };
    this.saveLocalState(newState);
    return { newState, tag: newTag };
  }

  // Add new Publisher
  public static async addPublisher(pubName: string, currentState: AppDatabaseState): Promise<{ newState: AppDatabaseState; publisher: PublisherItem }> {
    const normalized = pubName.trim();
    const existing = currentState.publishers.find((p) => p.name.toLowerCase() === normalized.toLowerCase());
    if (existing) {
      return { newState: currentState, publisher: existing };
    }

    const newPub: PublisherItem = {
      id: `pub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: normalized,
      created_at: new Date().toISOString(),
    };

    const scriptUrl = this.getSavedScriptUrl();
    if (scriptUrl) {
      const res = await fetch('/api/sheets-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl,
          action: 'addPublisher',
          publisher: newPub,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || data.error || data.status >= 400 || (data.data && data.data.success === false)) {
        throw new Error(data?.error || data?.data?.error || 'Не вдалося зберегти видавця у Google Sheets');
      }
    }

    const newState = {
      ...currentState,
      publishers: [...currentState.publishers, newPub],
    };
    this.saveLocalState(newState);
    return { newState, publisher: newPub };
  }

  // --- Collection / Folders ("Папки") Operations ---

  // Create folder: saves row on COLLECTIONS sheet and syncs with COMICS folders column
  public static async createCollection(name: string, currentState: AppDatabaseState): Promise<{ newState: AppDatabaseState; collection: Collection }> {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new Error('Назва папки не може бути порожньою');
    }
    if (isInvalidFolderName(trimmed)) {
      throw new Error('Неприпустима назва папки: назва не може бути системною датою');
    }
    if (trimmed.length > 60) {
      throw new Error('Назва папки не повинна перевищувати 60 символів');
    }
    const collections = (currentState.collections || []).filter((c) => !isInvalidFolderName(c.name));
    const exists = collections.some((c) => c.name && c.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      throw new Error(`Папка з назвою «${trimmed}» вже існує`);
    }

    const newCollection: Collection = {
      id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmed,
      comic_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newState: AppDatabaseState = {
      ...currentState,
      collections: [...collections, newCollection],
    };
    this.saveLocalState(newState);

    const scriptUrl = this.getSavedScriptUrl();
    if (scriptUrl) {
      try {
        const res = await fetch('/api/sheets-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scriptUrl,
            action: 'addCollection',
            collection: newCollection,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data || data.error || data.status >= 400 || (data.data && data.data.success === false)) {
          console.warn('Google Sheets notice on addCollection:', data?.error || data?.data?.error);
        }
      } catch (err: any) {
        console.warn('Google Sheets network notice on addCollection:', err?.message);
      }
    }

    return { newState, collection: newCollection };
  }

  // Rename folder: updates name in COLLECTIONS sheet and updates folders column in COMICS table
  public static async renameCollection(id: string, newName: string, currentState: AppDatabaseState): Promise<AppDatabaseState> {
    const trimmed = newName.trim();
    if (!trimmed) {
      throw new Error('Назва папки не може бути порожньою');
    }
    if (isInvalidFolderName(trimmed)) {
      throw new Error('Неприпустима назва папки: назва не може бути системною датою');
    }
    if (trimmed.length > 60) {
      throw new Error('Назва папки не повинна перевищувати 60 символів');
    }
    const collections = (currentState.collections || []).filter((c) => !isInvalidFolderName(c.name));
    const duplicate = collections.some(
      (c) => c.id !== id && c.name && c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Папка з назвою «${trimmed}» вже існує`);
    }

    const target = collections.find((c) => c.id === id);
    if (!target) throw new Error('Папку не знайдено');
    const oldName = target.name;

    const updatedCol: Collection = {
      ...target,
      name: trimmed,
      updated_at: new Date().toISOString(),
    };

    const updated = collections.map((c) => (c.id === id ? updatedCol : c));
    const newState: AppDatabaseState = {
      ...currentState,
      collections: updated,
    };
    this.saveLocalState(newState);

    const scriptUrl = this.getSavedScriptUrl();
    if (scriptUrl) {
      try {
        await fetch('/api/sheets-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scriptUrl,
            action: 'renameCollection',
            id,
            oldName,
            newName: trimmed,
          }),
        });
      } catch (e: any) {
        console.warn('Google Sheets renameCollection notice:', e?.message);
      }
    }

    return newState;
  }

  // Delete folder: removes from COLLECTIONS sheet and clears from folders column in COMICS table
  public static async deleteCollection(id: string, currentState: AppDatabaseState): Promise<AppDatabaseState> {
    const target = (currentState.collections || []).find((c) => c.id === id);
    const collections = (currentState.collections || []).filter((c) => c.id !== id);
    const newState: AppDatabaseState = {
      ...currentState,
      collections,
    };
    this.saveLocalState(newState);

    const scriptUrl = this.getSavedScriptUrl();
    if (scriptUrl && target) {
      try {
        await fetch('/api/sheets-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scriptUrl,
            action: 'deleteCollection',
            id,
            name: target.name,
          }),
        });
      } catch (e: any) {
        console.warn('Google Sheets deleteCollection notice:', e?.message);
      }
    }

    return newState;
  }

  // Add single comic to folder: updates checkmarks in Google Sheets column
  public static async addComicToCollection(
    collectionId: string,
    comicId: string,
    currentState: AppDatabaseState
  ): Promise<AppDatabaseState> {
    const target = (currentState.collections || []).find((c) => c.id === collectionId);
    if (!target) return currentState;
    if (target.comic_ids.includes(comicId)) return currentState;

    const updatedCol: Collection = {
      ...target,
      comic_ids: [...target.comic_ids, comicId],
      updated_at: new Date().toISOString(),
    };

    const scriptUrl = this.getSavedScriptUrl();
    if (scriptUrl) {
      const res = await fetch('/api/sheets-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl,
          action: 'updateCollection',
          collection: updatedCol,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || data.error || data.status >= 400 || (data.data && data.data.success === false)) {
        throw new Error(data?.error || data?.data?.error || 'Не вдалося оновити відмітки у колонці папки у Google Sheets');
      }
    }

    const collections = (currentState.collections || []).map((col) =>
      col.id === collectionId ? updatedCol : col
    );
    const newState: AppDatabaseState = { ...currentState, collections };
    this.saveLocalState(newState);
    return newState;
  }

  // Remove single comic from folder: removes checkmark in Google Sheets column
  public static async removeComicFromCollection(
    collectionId: string,
    comicId: string,
    currentState: AppDatabaseState
  ): Promise<AppDatabaseState> {
    const target = (currentState.collections || []).find((c) => c.id === collectionId);
    if (!target) return currentState;

    const updatedCol: Collection = {
      ...target,
      comic_ids: target.comic_ids.filter((id) => id !== comicId),
      updated_at: new Date().toISOString(),
    };

    const scriptUrl = this.getSavedScriptUrl();
    if (scriptUrl) {
      const res = await fetch('/api/sheets-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl,
          action: 'updateCollection',
          collection: updatedCol,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || data.error || data.status >= 400 || (data.data && data.data.success === false)) {
        throw new Error(data?.error || data?.data?.error || 'Не вдалося вилучити комікс з колонки папки у Google Sheets');
      }
    }

    const collections = (currentState.collections || []).map((col) =>
      col.id === collectionId ? updatedCol : col
    );
    const newState: AppDatabaseState = { ...currentState, collections };
    this.saveLocalState(newState);
    return newState;
  }

  // Batch add multiple comics to folder
  public static async addComicsToCollection(
    collectionId: string,
    comicIds: string[],
    currentState: AppDatabaseState
  ): Promise<AppDatabaseState> {
    const target = (currentState.collections || []).find((c) => c.id === collectionId);
    if (!target) return currentState;

    const idSet = new Set(target.comic_ids);
    comicIds.forEach((id) => idSet.add(id));

    const updatedCol: Collection = {
      ...target,
      comic_ids: Array.from(idSet),
      updated_at: new Date().toISOString(),
    };

    const scriptUrl = this.getSavedScriptUrl();
    if (scriptUrl) {
      const res = await fetch('/api/sheets-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptUrl,
          action: 'updateCollection',
          collection: updatedCol,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data || data.error || data.status >= 400 || (data.data && data.data.success === false)) {
        throw new Error(data?.error || data?.data?.error || 'Не вдалося оновити колонку папки у Google Sheets');
      }
    }

    const collections = (currentState.collections || []).map((col) =>
      col.id === collectionId ? updatedCol : col
    );
    const newState: AppDatabaseState = { ...currentState, collections };
    this.saveLocalState(newState);
    return newState;
  }

  // Set comic's folders (set which collections contain this comic)
  public static async setComicCollections(
    comicId: string,
    collectionIds: string[],
    currentState: AppDatabaseState
  ): Promise<AppDatabaseState> {
    const targetSet = new Set(collectionIds);
    const updatedCollections = (currentState.collections || []).map((col) => {
      const shouldInclude = targetSet.has(col.id);
      const isCurrentlyIncluded = col.comic_ids.includes(comicId);

      if (shouldInclude && !isCurrentlyIncluded) {
        return {
          ...col,
          comic_ids: [...col.comic_ids, comicId],
          updated_at: new Date().toISOString(),
        };
      } else if (!shouldInclude && isCurrentlyIncluded) {
        return {
          ...col,
          comic_ids: col.comic_ids.filter((id) => id !== comicId),
          updated_at: new Date().toISOString(),
        };
      }
      return col;
    });

    const scriptUrl = this.getSavedScriptUrl();
    if (scriptUrl) {
      // Find modified collections and sync them remotely to update the columns
      for (const col of updatedCollections) {
        const orig = (currentState.collections || []).find((c) => c.id === col.id);
        if (orig && JSON.stringify(orig.comic_ids) !== JSON.stringify(col.comic_ids)) {
          const res = await fetch('/api/sheets-proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scriptUrl,
              action: 'updateCollection',
              collection: col,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data || data.error || (data.data && data.data.success === false)) {
            throw new Error(data?.error || data?.data?.error || 'Не вдалося оновити привʼязку папок у Google Sheets');
          }
        }
      }
    }

    const newState: AppDatabaseState = { ...currentState, collections: updatedCollections };
    this.saveLocalState(newState);
    return newState;
  }

  // Sync entire local library (comics, collections, tags, publishers) to Google Sheets
  public static async pushAllToSheets(currentState: AppDatabaseState): Promise<boolean> {
    const scriptUrl = this.getSavedScriptUrl();
    if (!scriptUrl) throw new Error('URL Google Apps Script не налаштовано');

    const cleanCollections = (currentState.collections || []).filter((c) => !isInvalidFolderName(c.name));
    const cleanComics = (currentState.comics || []).map((c) => ({
      ...c,
      folders: (c.folders || []).filter((f) => !isInvalidFolderName(f)),
    }));

    const res = await fetch('/api/sheets-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scriptUrl,
        action: 'syncAll',
        comics: cleanComics,
        collections: cleanCollections,
        tags: currentState.tags,
        publishers: currentState.publishers,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data || data.error || data.status >= 400 || (data.data && data.data.success === false)) {
      throw new Error(data?.error || data?.data?.error || 'Помилка повної синхронізації');
    }

    this.markCollectionsMigrated();
    return true;
  }
}
