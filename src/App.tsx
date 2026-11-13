import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Sparkles,
  BookMarked,
  Clock,
  Compass,
  AlertCircle,
  CheckCircle2,
  X,
  Library,
  Globe,
} from 'lucide-react';
import {
  Comic,
  Collection,
  ViewMode,
  SortOption,
  FilterState,
  PublisherItem,
  PriorityItem,
  StatusItem,
  TagItem,
} from './types/comic.ts';
import {
  SheetsService,
  AppDatabaseState,
  INITIAL_COMICS,
  INITIAL_PUBLISHERS,
  INITIAL_PRIORITIES,
  INITIAL_STATUSES,
  INITIAL_TAGS,
} from './services/sheetsService.ts';
import { Navbar } from './components/Navbar.tsx';
import { FilterBar } from './components/FilterBar.tsx';
import { FolderBar } from './components/FolderBar.tsx';
import { FolderModal } from './components/FolderModal.tsx';
import { DeleteFolderModal } from './components/DeleteFolderModal.tsx';
import { ComicFolderModal } from './components/ComicFolderModal.tsx';
import { AddComicsToFolderModal } from './components/AddComicsToFolderModal.tsx';
import { CompactView } from './components/CompactView.tsx';
import { DetailedView } from './components/DetailedView.tsx';
import { GridView } from './components/GridView.tsx';
import { AddComicModal } from './components/AddComicModal.tsx';
import { EditComicModal } from './components/EditComicModal.tsx';
import { QuickProgressModal } from './components/QuickProgressModal.tsx';
import { DeleteConfirmModal } from './components/DeleteConfirmModal.tsx';
import { RandomPickerModal } from './components/RandomPickerModal.tsx';
import { GoogleSheetsModal } from './components/GoogleSheetsModal.tsx';
import { BrowserIntegrationModal } from './components/BrowserIntegrationModal.tsx';
import { ComicCarousel } from './components/ComicCarousel.tsx';
import { ContinueReadingSlider } from './components/ContinueReadingSlider.tsx';
import { findMatchingComic } from './lib/comicUtils.ts';

const VIEW_MODE_STORAGE_KEY = 'comic_tracker_view_mode';

export default function App() {
  // App Database State
  const [dbState, setDbState] = useState<AppDatabaseState>({
    comics: INITIAL_COMICS,
    collections: [],
    tags: INITIAL_TAGS,
    publishers: INITIAL_PUBLISHERS,
    priorities: INITIAL_PRIORITIES,
    statuses: INITIAL_STATUSES,
    settings: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (saved === 'compact' || saved === 'detailed' || saved === 'grid') {
      return saved;
    }
    return 'detailed';
  });

  // Filters State (Default excludes "Прочитано" and uses multi-select arrays)
  const [filters, setFilters] = useState<FilterState>(() => ({
    search: '',
    statuses: ['Хочу прочитати', 'Читаю', 'Відкладено', 'Кинуто'],
    priorities: [],
    publishers: [],
    tags: [],
    sourceDomains: [],
  }));

  // Sort State (Default: priority_order ASC, then updated_at DESC)
  const [sortOption, setSortOption] = useState<SortOption>('priority_asc');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingComic, setEditingComic] = useState<Comic | null>(null);
  const [quickProgressComic, setQuickProgressComic] = useState<Comic | null>(null);
  const [deletingComic, setDeletingComic] = useState<Comic | null>(null);
  const [isRandomOpen, setIsRandomOpen] = useState(false);
  const [isSheetsOpen, setIsSheetsOpen] = useState(false);
  const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);
  const [extensionStatus, setExtensionStatus] = useState<'connected' | 'not_detected' | 'unknown'>('unknown');
  const [importMetadata, setImportMetadata] = useState<any>(null);

  // Folders ("Папки") State
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<Collection | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<Collection | null>(null);
  const [comicForFolderManage, setComicForFolderManage] = useState<Comic | null>(null);
  const [folderForAddingComics, setFolderForAddingComics] = useState<Collection | null>(null);

  const [unmigratedCollections, setUnmigratedCollections] = useState<Collection[] | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Change view mode and save in localStorage
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
  };

  // Initial load & Extension Auto-Sync handling
  useEffect(() => {
    const currentScriptUrl = SheetsService.getSavedScriptUrl();
    setSheetsUrl(currentScriptUrl);

    async function loadData() {
      setIsLoading(true);
      try {
        const { state, source, error, unmigratedLocalCollections } = await SheetsService.fetchAllData();
        setDbState(state);
        if (unmigratedLocalCollections && unmigratedLocalCollections.length > 0) {
          setUnmigratedCollections(unmigratedLocalCollections);
        }
        if (error) {
          showToast(error, 'info');
        } else if (source === 'sheets') {
          showToast('Дані успішно синхронізовано з Google Sheets', 'success');
        }

        // Check for extension sync / add URL parameters
        const hash = window.location.hash;
        const search = window.location.search;
        const params = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : search);

        const readingUrl = params.get('reading_url');
        const title = params.get('title');
        const seriesUrl = params.get('series_url');
        const coverUrl = params.get('cover_url');
        const currentIssue = params.get('current_issue');
        const currentPageStr = params.get('current_page');
        const currentPage = currentPageStr ? parseInt(currentPageStr, 10) : null;
        const clientTimestamp = params.get('client_timestamp');

        if (readingUrl || title) {
          const matched = findMatchingComic(
            { title: title || '', seriesUrl: seriesUrl || '', readingUrl: readingUrl || '' },
            state.comics
          );
          if (matched) {
            // Conflict Resolution
            const incomingTimestamp = clientTimestamp ? new Date(clientTimestamp).getTime() : 0;
            const existingTimestamp = matched.progress_updated_at ? new Date(matched.progress_updated_at).getTime() : 0;
            const isManualSync = params.get('sync_type') === 'manual';

            // Update if newer, or if it's a manual sync (explicit user intent)
            if (isManualSync || incomingTimestamp > existingTimestamp) {
              const updatedComic: Comic = {
                ...matched,
                current_issue: currentIssue || matched.current_issue,
                current_page: currentPage !== null ? currentPage : matched.current_page,
                reading_url: readingUrl || matched.reading_url,
                status: matched.status === 'Хочу прочитати' ? 'Читаю' : matched.status,
                updated_at: new Date().toISOString(),
                progress_updated_at: clientTimestamp || new Date().toISOString(),
                last_read_at: new Date().toISOString(),
              };
              const updatedState = await SheetsService.updateComic(updatedComic, state);
              setDbState(updatedState);
              showToast(
                `Прогрес коміксу «${matched.title}» ${isManualSync ? 'вручну синхронізовано' : 'автоматично оновлено'} (Випуск #${updatedComic.current_issue || '1'}, стор. ${updatedComic.current_page || 1})!`,
                'success'
              );
            } else {
              showToast(`Прогрес коміксу «${matched.title}» не оновлено (отримано старіші дані).`, 'info');
            }
          } else {
            setImportMetadata({
              title: title || '',
              series_url: seriesUrl || '',
              reading_url: readingUrl || '',
              cover_url: coverUrl || '',
              current_issue: currentIssue || '',
              current_page: currentPage || 1,
            });
            setIsAddOpen(true);
            showToast('Комікс не знайдено в бібліотеці. Будь ласка, підтвердіть додавання.', 'info');
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err: any) {
        showToast(`Помилка завантаження: ${err.message}`, 'error');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    // Extension detection
    const checkExtension = () => {
      setExtensionStatus('not_detected');
      window.postMessage({ type: 'CHECK_EXTENSION' }, '*');
    };

    const handleWindowMessage = (event: MessageEvent) => {
      // SECURITY: Validate origin
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'EXTENSION_METADATA') {
        const metadata = event.data.metadata;

        // SECURITY: Validate payload shape and field lengths
        if (!metadata || typeof metadata !== 'object') return;

        const validateStr = (val: any, maxLen: number) =>
          typeof val === 'string' && val.length <= maxLen;
        const validateUrl = (val: any) =>
          typeof val === 'string' &&
          val.length <= 2048 &&
          /^https?:\/\//i.test(val) &&
          !val.startsWith('data:');

        const isValid =
          validateStr(metadata.title, 500) &&
          (metadata.coverUrl ? validateUrl(metadata.coverUrl) : true) &&
          (metadata.seriesUrl ? validateUrl(metadata.seriesUrl) : true) &&
          (metadata.readingUrl ? validateUrl(metadata.readingUrl) : true);

        if (!isValid) return;

        setExtensionStatus('connected');

        if (event.data.isAutoSync && metadata.readingUrl) {
          handleAutoSyncUpdate(metadata);
        }
      }
    };

    window.addEventListener('message', handleWindowMessage);

    // Helper for background/auto-sync updates
    const handleAutoSyncUpdate = async (metadata: any) => {
      setDbState((prev) => {
        const matched = findMatchingComic(
          { title: metadata.title || '', seriesUrl: metadata.seriesUrl || '', readingUrl: metadata.readingUrl || '' },
          prev.comics
        );

        if (matched) {
          const updatedComic: Comic = {
            ...matched,
            current_issue: metadata.current_issue || matched.current_issue,
            current_page: metadata.current_page !== undefined ? metadata.current_page : matched.current_page,
            reading_url: metadata.reading_url || matched.reading_url,
            status: matched.status === 'Хочу прочитати' ? 'Читаю' : matched.status,
            updated_at: new Date().toISOString(),
            progress_updated_at: new Date().toISOString(),
            last_read_at: new Date().toISOString(),
          };

          SheetsService.updateComic(updatedComic, prev)
            .then((newState) => {
              setDbState(newState);
            })
            .catch((err) => {
              console.error('Auto-sync Sheets error:', err);
            });

          return {
            ...prev,
            comics: prev.comics.map((c) => (c.id === updatedComic.id ? updatedComic : c)),
          };
        }
        return prev;
      });
    };

    const timer = setTimeout(checkExtension, 1000);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', handleWindowMessage);
    };
  }, []);

  // Sync refresh handler
  const handleSyncRefresh = async () => {
    setIsSyncing(true);
    try {
      const { state, error } = await SheetsService.fetchAllData();
      setDbState(state);
      if (error) {
        showToast(error, 'info');
      } else {
        showToast('Бібліотеку оновлено', 'success');
      }
    } catch (err: any) {
      showToast(`Помилка оновлення: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Save Sheets URL
  const handleSaveSheetsUrl = async (url: string) => {
    SheetsService.saveScriptUrl(url);
    setSheetsUrl(url);
    if (url) {
      await handleSyncRefresh();
    }
  };

  // Push all local comics to Sheets
  const handlePushAllToSheets = async () => {
    await SheetsService.pushAllToSheets(dbState);
    showToast('Всі комікси успішно завантажено в Google Sheets', 'success');
  };

  // Unique source domains for filter dropdown
  const sourceDomains = useMemo(() => {
    const domains = new Set<string>();
    dbState.comics.forEach((c) => {
      if (c.source_domain) domains.add(c.source_domain);
    });
    return Array.from(domains);
  }, [dbState.comics]);

  // Handle Comic Addition
  const handleAddComic = async (newComic: Comic, customPublisher?: string, newTags?: string[]) => {
    let currentState = dbState;

    if (customPublisher) {
      const pubRes = await SheetsService.addPublisher(customPublisher, currentState);
      currentState = pubRes.newState;
    }

    const canonicalTagNames: string[] = [];
    const tagsToProcess = newTags && newTags.length > 0 ? newTags : newComic.tags || [];
    for (const t of tagsToProcess) {
      const trimmed = (t || '').trim();
      if (!trimmed) continue;
      const tagRes = await SheetsService.addTag(trimmed, currentState);
      currentState = tagRes.newState;
      if (!canonicalTagNames.includes(tagRes.tag.name)) {
        canonicalTagNames.push(tagRes.tag.name);
      }
    }

    const comicToSave: Comic = {
      ...newComic,
      tags: canonicalTagNames,
    };

    const updatedState = await SheetsService.addComic(comicToSave, currentState);
    setDbState(updatedState);
    showToast(`Комікс «${comicToSave.title}» додано до бібліотеки!`, 'success');
  };

  // Handle Comic Update
  const handleUpdateComic = async (updatedComic: Comic, customPublisher?: string, newTags?: string[]) => {
    let currentState = dbState;

    if (customPublisher) {
      const pubRes = await SheetsService.addPublisher(customPublisher, currentState);
      currentState = pubRes.newState;
    }

    const canonicalTagNames: string[] = [];
    const tagsToProcess = newTags && newTags.length > 0 ? newTags : updatedComic.tags || [];
    for (const t of tagsToProcess) {
      const trimmed = (t || '').trim();
      if (!trimmed) continue;
      const tagRes = await SheetsService.addTag(trimmed, currentState);
      currentState = tagRes.newState;
      if (!canonicalTagNames.includes(tagRes.tag.name)) {
        canonicalTagNames.push(tagRes.tag.name);
      }
    }

    const comicToSave: Comic = {
      ...updatedComic,
      tags: canonicalTagNames,
    };

    const updatedState = await SheetsService.updateComic(comicToSave, currentState);
    setDbState(updatedState);
    showToast(`Комікс «${comicToSave.title}» оновлено!`, 'success');
  };

  // Handle Quick Progress
  const handleQuickProgress = async (
    id: string,
    patch: { current_issue?: string; current_page?: number | null; reading_url?: string; status?: string }
  ) => {
    const updatedState = await SheetsService.quickProgress(id, patch, dbState);
    setDbState(updatedState);
    showToast('Прогрес читання збережено!', 'success');
  };

  // Handle Comic Delete
  const handleDeleteComic = async (id: string) => {
    const comicToDelete = dbState.comics.find((c) => c.id === id);
    const updatedState = await SheetsService.deleteComic(id, dbState);
    setDbState(updatedState);
    showToast(`Комікс «${comicToDelete?.title || ''}» видалено`, 'info');
  };

  // --- Folder Handlers ---
  const handleCreateFolder = async (name: string): Promise<Collection> => {
    try {
      const res = await SheetsService.createCollection(name, dbState);
      setDbState(res.newState);
      showToast(`Папку «${name}» створено!`, 'success');
      return res.collection;
    } catch (err: any) {
      showToast(err?.message || 'Помилка створення папки', 'error');
      throw err;
    }
  };

  const handleRenameFolder = async (name: string) => {
    if (!folderToRename) return;
    try {
      const updatedState = await SheetsService.renameCollection(folderToRename.id, name, dbState);
      setDbState(updatedState);
      showToast(`Папку перейменовано на «${name}»!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Помилка перейменування папки', 'error');
      throw err;
    }
  };

  const handleDeleteFolder = async (id: string) => {
    const folder = (dbState.collections || []).find((f) => f.id === id);
    try {
      const updatedState = await SheetsService.deleteCollection(id, dbState);
      setDbState(updatedState);
      if (activeFolderId === id) {
        setActiveFolderId(null);
      }
      showToast(`Папку «${folder?.name || ''}» видалено. Комікси збережено в бібліотеці.`, 'info');
    } catch (err: any) {
      showToast(err?.message || 'Помилка видалення папки', 'error');
    }
  };

  const handleRemoveComicFromFolder = async (comic: Comic, folderId: string) => {
    const folder = (dbState.collections || []).find((f) => f.id === folderId);
    try {
      const updatedState = await SheetsService.removeComicFromCollection(folderId, comic.id, dbState);
      setDbState(updatedState);
      showToast(`Комікс «${comic.title}» вилучено з папки «${folder?.name || ''}»`, 'info');
    } catch (err: any) {
      showToast(err?.message || 'Помилка вилучення з папки', 'error');
    }
  };

  const handleBatchAddComicsToFolder = async (folderId: string, comicIds: string[]) => {
    const folder = (dbState.collections || []).find((f) => f.id === folderId);
    try {
      const updatedState = await SheetsService.addComicsToCollection(folderId, comicIds, dbState);
      setDbState(updatedState);
      showToast(`Додано ${comicIds.length} коміксів до папки «${folder?.name || ''}»!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Помилка додавання до папки', 'error');
      throw err;
    }
  };

  const handleSetComicFolders = async (comicId: string, folderIds: string[]) => {
    try {
      const updatedState = await SheetsService.setComicCollections(comicId, folderIds, dbState);
      setDbState(updatedState);
      showToast('Папки коміксу збережено!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Помилка збереження папок', 'error');
      throw err;
    }
  };

  const handleAcceptMigration = async () => {
    if (!unmigratedCollections) return;
    try {
      const newState: AppDatabaseState = {
        ...dbState,
        collections: unmigratedCollections,
      };
      await SheetsService.pushAllToSheets(newState);
      setDbState(newState);
      setUnmigratedCollections(null);
      showToast(`Успішно синхронізовано ${unmigratedCollections.length} локальних папок у Google Sheets!`, 'success');
    } catch (err: any) {
      showToast(`Помилка синхронізації папок: ${err.message}`, 'error');
    }
  };

  const handleDismissMigration = () => {
    SheetsService.markCollectionsMigrated();
    setUnmigratedCollections(null);
    showToast('Використовуються порожні папки з Google Sheets', 'info');
  };

  // Section 1: "Продовжити читання" - comics with last_read_at, sorted by recently read (excluding finished)
  const continueReadingComics = useMemo(() => {
    return dbState.comics
      .filter((c) => c.last_read_at && c.status !== 'Прочитано')
      .sort((a, b) => new Date(b.last_read_at!).getTime() - new Date(a.last_read_at!).getTime())
      .slice(0, 8);
  }, [dbState.comics]);

  // Section 2: "Наступні"
  const nextUpComics = useMemo(() => {
    const activeComics = dbState.comics.filter(
      (c) => c.status !== 'Прочитано' && c.status !== 'Кинуто'
    );

    const g1 = activeComics
      .filter((c) => c.status === 'Читаю' && (c.priority_order === 1 || c.priority_order === 2))
      .sort((a, b) => {
        if (a.priority_order !== b.priority_order) return a.priority_order - b.priority_order;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

    const g2 = activeComics
      .filter((c) => c.status === 'Хочу прочитати' && (c.priority_order === 1 || c.priority_order === 2))
      .sort((a, b) => {
        if (a.priority_order !== b.priority_order) return a.priority_order - b.priority_order;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

    const usedIds = new Set([...g1.map((c) => c.id), ...g2.map((c) => c.id)]);
    const pGroups: Comic[] = [];

    for (let p = 3; p <= 10; p++) {
      const readingP = activeComics
        .filter((c) => !usedIds.has(c.id) && c.status === 'Читаю' && c.priority_order === p)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      readingP.forEach((c) => {
        usedIds.add(c.id);
        pGroups.push(c);
      });

      const wantToReadP = activeComics
        .filter((c) => !usedIds.has(c.id) && c.status === 'Хочу прочитати' && c.priority_order === p)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      wantToReadP.forEach((c) => {
        usedIds.add(c.id);
        pGroups.push(c);
      });

      const otherP = activeComics
        .filter((c) => !usedIds.has(c.id) && c.priority_order === p)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      otherP.forEach((c) => {
        usedIds.add(c.id);
        pGroups.push(c);
      });
    }

    const leftovers = activeComics
      .filter((c) => !usedIds.has(c.id))
      .sort((a, b) => {
        if (a.priority_order !== b.priority_order) return a.priority_order - b.priority_order;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

    return [...g1, ...g2, ...pGroups, ...leftovers].slice(0, 20);
  }, [dbState.comics]);

  // Fast comic lookup map
  const comicsMap = useMemo(() => {
    const map = new Map<string, Comic>();
    dbState.comics.forEach((c) => map.set(c.id, c));
    return map;
  }, [dbState.comics]);

  // Active (non-read) comics count
  const unreadComicsCount = useMemo(() => {
    return dbState.comics.filter((c) => c.status !== 'Прочитано').length;
  }, [dbState.comics]);

  // Active (non-read) count per folder
  const getFolderComicCount = (folder: Collection) => {
    return folder.comic_ids.filter((id) => {
      const c = comicsMap.get(id);
      return c && c.status !== 'Прочитано';
    }).length;
  };

  // Default non-read statuses
  const defaultNonReadStatuses = useMemo(() => {
    const list = dbState.statuses.map((s) => s.name).filter((n) => n !== 'Прочитано');
    return list.length > 0 ? list : ['Хочу прочитати', 'Читаю', 'Відкладено', 'Кинуто'];
  }, [dbState.statuses]);

  // Check if status filter is in a custom (non-default) state
  const isStatusCustom = useMemo(() => {
    if (!filters.statuses) return false;
    if (filters.statuses.length !== defaultNonReadStatuses.length) return true;
    const hasRead = filters.statuses.includes('Прочитано');
    if (hasRead) return true;
    return defaultNonReadStatuses.some((n) => !filters.statuses.includes(n));
  }, [filters.statuses, defaultNonReadStatuses]);

  // Section 3: "Уся бібліотека" with filtering and sorting
  const filteredAndSortedComics = useMemo(() => {
    let result = [...dbState.comics];

    // Filter by active folder
    if (activeFolderId) {
      const activeCol = (dbState.collections || []).find((c) => c.id === activeFolderId);
      if (activeCol) {
        const idSet = new Set(activeCol.comic_ids);
        result = result.filter((c) => idSet.has(c.id));
      }
    }

    // Client-side search by title, publisher, tags, note
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter((c) => {
        const inTitle = c.title.toLowerCase().includes(q);
        const inPublisher = (c.publisher || '').toLowerCase().includes(q);
        const inNote = (c.note || '').toLowerCase().includes(q);
        const inTags = (c.tags || []).some((t) => t.toLowerCase().includes(q));
        return inTitle || inPublisher || inNote || inTags;
      });
    }

    // Filter by statuses (multi-select checkboxes)
    if (filters.statuses && filters.statuses.length > 0) {
      const statusSet = new Set(filters.statuses);
      result = result.filter((c) => statusSet.has(c.status));
    } else if (filters.statuses && filters.statuses.length === 0) {
      result = [];
    }

    // Filter by priorities (multi-select checkboxes)
    if (filters.priorities && filters.priorities.length > 0) {
      const prioritySet = new Set(filters.priorities);
      result = result.filter((c) => prioritySet.has(c.priority));
    }

    // Filter by publishers (multi-select checkboxes)
    if (filters.publishers && filters.publishers.length > 0) {
      const pubSet = new Set(filters.publishers);
      result = result.filter((c) => pubSet.has(c.publisher));
    }

    // Filter by tags (multi-select checkboxes: comic matches if it has ANY selected tag)
    if (filters.tags && filters.tags.length > 0) {
      const tagSet = new Set(filters.tags);
      result = result.filter((c) => (c.tags || []).some((t) => tagSet.has(t)));
    }

    // Filter by source domain (multi-select checkboxes)
    if (filters.sourceDomains && filters.sourceDomains.length > 0) {
      const domainSet = new Set(filters.sourceDomains);
      result = result.filter((c) => domainSet.has(c.source_domain));
    }

    // Sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'priority_asc':
          if (a.priority_order !== b.priority_order) {
            return a.priority_order - b.priority_order;
          }
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'updated_desc':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'title_asc':
          return a.title.localeCompare(b.title, 'uk');
        case 'title_desc':
          return b.title.localeCompare(a.title, 'uk');
        case 'progress_desc': {
          const valA = a.current_issue ? parseFloat(a.current_issue) || 0 : 0;
          const valB = b.current_issue ? parseFloat(b.current_issue) || 0 : 0;
          return valB - valA;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [dbState.comics, dbState.collections, activeFolderId, filters, sortOption]);

  const handleResetFilters = () => {
    setFilters({
      search: '',
      statuses: [...defaultNonReadStatuses],
      priorities: [],
      publishers: [],
      tags: [],
      sourceDomains: [],
    });
    setActiveFolderId(null);
  };

  const hasActiveFilters = Boolean(
    filters.search ||
      (filters.priorities && filters.priorities.length > 0) ||
      (filters.publishers && filters.publishers.length > 0) ||
      (filters.tags && filters.tags.length > 0) ||
      (filters.sourceDomains && filters.sourceDomains.length > 0) ||
      isStatusCustom ||
      activeFolderId
  );

  const activeFolder = (dbState.collections || []).find((f) => f.id === activeFolderId) || null;

  return (
    <div className="min-h-screen bg-[#0c0d14] text-zinc-200 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#1a1c2b] border border-white/15 text-xs shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0" />
          )}
          <span className="font-medium text-white">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1.5 text-zinc-400 hover:text-white cursor-pointer ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        search={filters.search}
        onSearchChange={(val) => setFilters((f) => ({ ...f, search: val }))}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenAddModal={() => setIsAddOpen(true)}
        onOpenRandomModal={() => setIsRandomOpen(true)}
        onOpenSheetsModal={() => setIsSheetsOpen(true)}
        onOpenIntegration={() => setIsIntegrationOpen(true)}
        onSyncRefresh={handleSyncRefresh}
        isSyncing={isSyncing}
        sheetsConnected={Boolean(sheetsUrl)}
      />

      {/* Filter and Sorting Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        onResetFilters={handleResetFilters}
        sortOption={sortOption}
        onSortChange={setSortOption}
        publishers={dbState.publishers}
        priorities={dbState.priorities}
        statuses={dbState.statuses}
        tags={dbState.tags}
        sourceDomains={sourceDomains}
        totalResults={filteredAndSortedComics.length}
        allComics={dbState.comics}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-full mx-auto px-4 lg:px-8 py-6 space-y-8">
        {/* Migration Prompt Banner */}
        {unmigratedCollections && unmigratedCollections.length > 0 && (
          <div className="bg-indigo-950/80 border border-indigo-500/40 rounded-2xl p-4 text-sm text-zinc-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xl">
            <div>
              <h4 className="font-semibold text-white">Знайдено локальні папки ({unmigratedCollections.length})</h4>
              <p className="text-xs text-zinc-300 mt-0.5">
                У вашій Google Таблиці ще немає папок. Синхронізувати знайдені локальні папки в Google Sheets?
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleAcceptMigration}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md transition-colors cursor-pointer"
              >
                Синхронізувати папки
              </button>
              <button
                type="button"
                onClick={handleDismissMigration}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 font-medium text-xs transition-colors cursor-pointer"
              >
                Ні, використати Sheets
              </button>
            </div>
          </div>
        )}

        {/* Folders Navigation Bar */}
        <FolderBar
          folders={dbState.collections || []}
          activeFolderId={activeFolderId}
          onSelectFolder={(id) => setActiveFolderId(id)}
          onOpenCreateFolder={() => setIsCreateFolderOpen(true)}
          onOpenRenameFolder={(f) => setFolderToRename(f)}
          onOpenDeleteFolder={(f) => setFolderToDelete(f)}
          onOpenAddComicsToFolder={(f) => setFolderForAddingComics(f)}
          totalComicsCount={unreadComicsCount}
          getFolderComicCount={getFolderComicCount}
        />

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-zinc-400 font-medium">Завантаження бібліотеки коміксів...</p>
          </div>
        ) : (
          <>
            {/* SECTION 1: "Продовжити читання" (Only if no active filter/folder query) */}
            {!hasActiveFilters && continueReadingComics.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white tracking-tight">
                        Продовжити читання
                      </h2>
                      <p className="text-[11px] text-zinc-400">
                        Комікси, які ви читали нещодавно
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {continueReadingComics.length}
                  </span>
                </div>

                <ContinueReadingSlider
                  comics={continueReadingComics}
                  collections={dbState.collections || []}
                  activeCollectionId={activeFolderId}
                  onOpenQuickProgress={(c) => setQuickProgressComic(c)}
                  onOpenEdit={(c) => setEditingComic(c)}
                  onRequestDelete={(c) => setDeletingComic(c)}
                  onOpenManageFolders={(c) => setComicForFolderManage(c)}
                  onRemoveFromFolder={handleRemoveComicFromFolder}
                  onSelectFolder={(id) => setActiveFolderId(id)}
                />
              </section>
            )}

            {/* SECTION 2: "Наступні" (Highest priority with status "Хочу прочитати") */}
            {!hasActiveFilters && nextUpComics.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <Compass className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white tracking-tight">
                        Наступні
                      </h2>
                      <p className="text-[11px] text-zinc-400">
                        Пріоритетні комікси: Читаю (1,2) → Хочу прочитати (1,2) → Почергово далі
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {nextUpComics.length}
                  </span>
                </div>

                <ComicCarousel
                  comics={nextUpComics}
                  collections={dbState.collections || []}
                  activeCollectionId={activeFolderId}
                  onOpenQuickProgress={(c) => setQuickProgressComic(c)}
                  onOpenEdit={(c) => setEditingComic(c)}
                  onRequestDelete={(c) => setDeletingComic(c)}
                  onOpenManageFolders={(c) => setComicForFolderManage(c)}
                  onRemoveFromFolder={handleRemoveComicFromFolder}
                  onSelectFolder={(id) => setActiveFolderId(id)}
                />
              </section>
            )}

            {/* SECTION 3: "Уся бібліотека" або "Папка: Назва" */}
            <section className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300">
                    <Library className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">
                      {activeFolder
                        ? `Папка: «${activeFolder.name}»`
                        : hasActiveFilters
                        ? 'Результати пошуку та фільтрації'
                        : 'Уся бібліотека'}
                    </h2>
                    <p className="text-[11px] text-zinc-400">
                      Всього в базі: {dbState.comics.length} • Непрочитаних: {unreadComicsCount} • У цій вибірці:{' '}
                      {filteredAndSortedComics.length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeFolder && (
                    <button
                      type="button"
                      onClick={() => setFolderForAddingComics(activeFolder)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Додати до папки</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Додати комікс</span>
                  </button>
                </div>
              </div>

              {filteredAndSortedComics.length === 0 ? (
                <div className="py-16 text-center bg-[#121420] border border-white/5 rounded-2xl p-8 space-y-3">
                  <BookMarked className="w-12 h-12 mx-auto text-zinc-600" />
                  <h3 className="text-base font-bold text-white">
                    {activeFolder ? 'У цій папці ще немає коміксів' : 'Коміксів не знайдено'}
                  </h3>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    {activeFolder
                      ? `Папка «${activeFolder.name}» порожня. Додайте комікси зі своєї бібліотеки!`
                      : hasActiveFilters
                      ? 'Немає коміксів, які відповідають обраним фільтрам або пошуковому запиту.'
                      : 'Ваша бібліотека порожня. Додайте свій перший комікс!'}
                  </p>
                  {activeFolder ? (
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setFolderForAddingComics(activeFolder)}
                        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer transition-colors"
                      >
                        + Додати комікси до папки
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveFolderId(null)}
                        className="px-4 py-2 rounded-lg bg-[#181a29] hover:bg-[#202336] text-zinc-300 text-xs font-medium border border-white/10 cursor-pointer transition-colors"
                      >
                        Усі комікси
                      </button>
                    </div>
                  ) : hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="px-4 py-2 rounded-lg bg-[#181a29] hover:bg-[#202336] text-zinc-200 text-xs font-medium border border-white/10 cursor-pointer transition-colors"
                    >
                      Скинути фільтри
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddOpen(true)}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer transition-colors"
                    >
                      + Додати перший комікс
                    </button>
                  )}
                </div>
              ) : viewMode === 'compact' ? (
                <CompactView
                  comics={filteredAndSortedComics}
                  collections={dbState.collections || []}
                  activeCollectionId={activeFolderId}
                  onOpenQuickProgress={(c) => setQuickProgressComic(c)}
                  onOpenEdit={(c) => setEditingComic(c)}
                  onRequestDelete={(c) => setDeletingComic(c)}
                  onOpenManageFolders={(c) => setComicForFolderManage(c)}
                  onRemoveFromFolder={handleRemoveComicFromFolder}
                  onSelectFolder={(id) => setActiveFolderId(id)}
                />
              ) : viewMode === 'grid' ? (
                <GridView
                  comics={filteredAndSortedComics}
                  collections={dbState.collections || []}
                  activeCollectionId={activeFolderId}
                  onOpenQuickProgress={(c) => setQuickProgressComic(c)}
                  onOpenEdit={(c) => setEditingComic(c)}
                  onRequestDelete={(c) => setDeletingComic(c)}
                  onOpenManageFolders={(c) => setComicForFolderManage(c)}
                  onRemoveFromFolder={handleRemoveComicFromFolder}
                  onSelectFolder={(id) => setActiveFolderId(id)}
                />
              ) : (
                <DetailedView
                  comics={filteredAndSortedComics}
                  collections={dbState.collections || []}
                  activeCollectionId={activeFolderId}
                  onOpenQuickProgress={(c) => setQuickProgressComic(c)}
                  onOpenEdit={(c) => setEditingComic(c)}
                  onRequestDelete={(c) => setDeletingComic(c)}
                  onOpenManageFolders={(c) => setComicForFolderManage(c)}
                  onRemoveFromFolder={handleRemoveComicFromFolder}
                  onSelectFolder={(id) => setActiveFolderId(id)}
                />
              )}
            </section>
          </>
        )}
      </main>

      {/* Modals */}
      <AddComicModal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          setImportMetadata(null);
        }}
        onSave={handleAddComic}
        onOpenExisting={(c) => {
          setEditingComic(c);
        }}
        onUpdateExisting={(c) => {
          handleUpdateComic(c);
        }}
        existingComics={dbState.comics}
        publishers={dbState.publishers}
        priorities={dbState.priorities}
        statuses={dbState.statuses}
        availableTags={dbState.tags}
        importMetadata={importMetadata}
        extensionStatus={extensionStatus}
        onOpenIntegration={() => setIsIntegrationOpen(true)}
      />

      <EditComicModal
        isOpen={Boolean(editingComic)}
        comic={editingComic}
        onClose={() => setEditingComic(null)}
        onSave={handleUpdateComic}
        publishers={dbState.publishers}
        priorities={dbState.priorities}
        statuses={dbState.statuses}
        availableTags={dbState.tags}
        folders={dbState.collections || []}
        onSaveFolders={handleSetComicFolders}
      />

      <QuickProgressModal
        isOpen={Boolean(quickProgressComic)}
        comic={quickProgressComic}
        onClose={() => setQuickProgressComic(null)}
        onSave={handleQuickProgress}
        statuses={dbState.statuses}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deletingComic)}
        comic={deletingComic}
        onClose={() => setDeletingComic(null)}
        onConfirmDelete={handleDeleteComic}
      />

      <RandomPickerModal
        isOpen={isRandomOpen}
        onClose={() => setIsRandomOpen(false)}
        filteredComics={filteredAndSortedComics}
      />

      <GoogleSheetsModal
        isOpen={isSheetsOpen}
        onClose={() => setIsSheetsOpen(false)}
        savedUrl={sheetsUrl}
        onSaveUrl={handleSaveSheetsUrl}
        onPushAllComics={handlePushAllToSheets}
        comicsCount={dbState.comics.length}
      />

      <BrowserIntegrationModal
        isOpen={isIntegrationOpen}
        onClose={() => setIsIntegrationOpen(false)}
        extensionStatus={extensionStatus}
      />

      {/* Folders Management Modals */}
      <FolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onSave={async (name) => {
          await handleCreateFolder(name);
        }}
        existingFolders={dbState.collections || []}
        isSheetsConnected={Boolean(sheetsUrl)}
        onOpenGoogleSheets={() => setIsSheetsOpen(true)}
      />

      <FolderModal
        isOpen={Boolean(folderToRename)}
        folderToEdit={folderToRename}
        onClose={() => setFolderToRename(null)}
        onSave={handleRenameFolder}
        existingFolders={dbState.collections || []}
        isSheetsConnected={Boolean(sheetsUrl)}
        onOpenGoogleSheets={() => setIsSheetsOpen(true)}
      />

      <DeleteFolderModal
        isOpen={Boolean(folderToDelete)}
        folder={folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onConfirmDelete={handleDeleteFolder}
      />

      <ComicFolderModal
        isOpen={Boolean(comicForFolderManage)}
        comic={comicForFolderManage}
        folders={dbState.collections || []}
        onClose={() => setComicForFolderManage(null)}
        onSave={handleSetComicFolders}
        onCreateFolder={handleCreateFolder}
      />

      <AddComicsToFolderModal
        isOpen={Boolean(folderForAddingComics)}
        folder={folderForAddingComics}
        allComics={dbState.comics}
        onClose={() => setFolderForAddingComics(null)}
        onAddComics={handleBatchAddComicsToFolder}
      />
    </div>
  );
}
