import React, { useState } from 'react';
import {
  X,
  Loader2,
  AlertCircle,
  Plus,
  BookOpen,
  Check,
  Folder,
} from 'lucide-react';
import {
  Comic,
  Collection,
  PublisherItem,
  PriorityItem,
  StatusItem,
  TagItem,
} from '../types/comic.ts';
import { ComicCover } from './ComicCover.tsx';
import { extractPageFromUrl } from '../lib/comicUtils.ts';
import { makeCoverDataUrl } from '../lib/coverImage.ts';

interface EditComicModalProps {
  isOpen: boolean;
  comic: Comic | null;
  onClose: () => void;
  onSave: (comic: Comic, customPublisher?: string, newTags?: string[]) => Promise<void>;
  publishers: PublisherItem[];
  priorities: PriorityItem[];
  statuses: StatusItem[];
  availableTags: TagItem[];
  folders?: Collection[];
  onSaveFolders?: (comicId: string, folderIds: string[]) => Promise<void>;
}

export const EditComicModal: React.FC<EditComicModalProps> = ({
  isOpen,
  comic,
  onClose,
  onSave,
  publishers,
  priorities,
  statuses,
  availableTags,
  folders = [],
  onSaveFolders,
}) => {
  if (!isOpen || !comic) return null;

  return <EditComicForm
    key={comic.id}
    comic={comic}
    onClose={onClose}
    onSave={onSave}
    publishers={publishers}
    priorities={priorities}
    statuses={statuses}
    availableTags={availableTags}
    folders={folders}
    onSaveFolders={onSaveFolders}
  />;
};

const EditComicForm: React.FC<{
  comic: Comic;
  onClose: () => void;
  onSave: (comic: Comic, customPublisher?: string, newTags?: string[]) => Promise<void>;
  publishers: PublisherItem[];
  priorities: PriorityItem[];
  statuses: StatusItem[];
  availableTags: TagItem[];
  folders: Collection[];
  onSaveFolders?: (comicId: string, folderIds: string[]) => Promise<void>;
}> = ({ comic, onClose, onSave, publishers, priorities, statuses, availableTags, folders, onSaveFolders }) => {
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>(() =>
    folders.filter((f) => f.comic_ids.includes(comic.id)).map((f) => f.id)
  );
  const [title, setTitle] = useState(comic.title || '');
  const [coverUrl, setCoverUrl] = useState(comic.cover_url || '');
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [seriesUrl, setSeriesUrl] = useState(comic.series_url || '');
  const [readingUrl, setReadingUrl] = useState(comic.reading_url || '');
  const [currentIssue, setCurrentIssue] = useState(comic.current_issue || '');
  const [currentPage, setCurrentPage] = useState<string>(
    comic.current_page !== null && comic.current_page !== undefined ? String(comic.current_page) : ''
  );
  const [totalIssues, setTotalIssues] = useState<string>(
    comic.total_issues !== null && comic.total_issues !== undefined ? String(comic.total_issues) : ''
  );

  const isPublisherKnown = publishers.some((p) => p.name === comic.publisher);
  const [publisher, setPublisher] = useState(isPublisherKnown ? comic.publisher : 'Інше');
  const [customPublisher, setCustomPublisher] = useState(isPublisherKnown ? '' : comic.publisher);

  const [priority, setPriority] = useState(comic.priority || '3 Звичайний');
  const [status, setStatus] = useState(comic.status || 'Хочу прочитати');
  const [tags, setTags] = useState<string[]>(comic.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [note, setNote] = useState(comic.note || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleCoverFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setCoverUploadError(null);
    try {
      setCoverUrl(await makeCoverDataUrl(file));
    } catch (error) {
      setCoverUploadError(error instanceof Error ? error.message : 'Не вдалося завантажити обкладинку.');
    }
  };
  const handleCoverPaste = async (event: React.ClipboardEvent<HTMLDivElement>) => {
    const file = Array.from(event.clipboardData.items)
      .find((item) => item.type.startsWith('image/'))
      ?.getAsFile() || event.clipboardData.files[0];
    if (!file) return;

    event.preventDefault();
    setCoverUploadError(null);
    try {
      setCoverUrl(await makeCoverDataUrl(file));
    } catch (error) {
      setCoverUploadError(error instanceof Error ? error.message : 'Не вдалося вставити обкладинку.');
    }
  };

  const handleReadingUrlChange = (val: string) => {
    setReadingUrl(val);
    const extracted = extractPageFromUrl(val);
    if (extracted !== null) {
      setCurrentPage(String(extracted));
    }
  };

  const handleAddTag = (rawTag: string) => {
    const trimmed = rawTag.trim();
    if (!trimmed || tags.length >= 5) return;
    const exists = tags.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      setTags([...tags, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!String(title || '').trim()) {
      setSubmitError('Введіть назву коміксу');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const selectedPriorityObj = priorities.find((p) => p.name === priority);
      const priorityOrder = selectedPriorityObj ? selectedPriorityObj.sort_order : comic.priority_order || 3;

      const trimmedCustomPub = String(customPublisher || '').trim();
      const finalPublisher =
        publisher === 'Інше' && trimmedCustomPub
          ? trimmedCustomPub
          : publisher;

      const updatedComic: Comic = {
        ...comic,
        title: String(title || '').trim(),
        cover_url: String(coverUrl || '').trim(),
        series_url: String(seriesUrl || '').trim(),
        reading_url: String(readingUrl || '').trim(),
        current_issue: String(currentIssue || '').trim(),
        current_page: currentPage ? parseInt(currentPage, 10) : null,
        total_issues: totalIssues ? parseInt(totalIssues, 10) : null,
        publisher: finalPublisher,
        priority: priority,
        priority_order: priorityOrder,
        status: status,
        tags: tags,
        note: String(note || '').trim(),
        updated_at: new Date().toISOString(),
      };

      await onSave(
        updatedComic,
        publisher === 'Інше' && trimmedCustomPub ? trimmedCustomPub : undefined,
        tags
      );
      if (onSaveFolders) {
        await onSaveFolders(comic.id, selectedFolderIds);
      }
      onClose();
    } catch (err: any) {
      setSubmitError(err?.message || 'Помилка при збереженні коміксу');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tagSuggestions = availableTags
    .filter(
      (at) =>
        !tags.some((t) => t.toLowerCase() === at.name.toLowerCase()) &&
        at.name.toLowerCase().includes(tagInput.toLowerCase())
    )
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#121420] border border-white/10 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col text-xs text-zinc-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#161826]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Редагувати комікс: {comic.title}
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

        {/* Form Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)] space-y-5">
          {/* Cover & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#161826] border border-white/5 rounded-xl p-4">
            <div className="sm:col-span-1 flex flex-col items-center">
              <span className="text-[11px] text-zinc-400 mb-1.5 font-medium">Обкладинка</span>
              <div className="w-24 h-36 shadow-lg rounded overflow-hidden">
                <ComicCover src={coverUrl} alt={title} className="w-full h-full" />
              </div>
            </div>

            <div className="sm:col-span-3 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  Назва коміксу *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div onPaste={handleCoverPaste}>
                <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                  URL обкладинки
                </label>
                <input
                  type="text"
                  inputMode="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                />
                <p className="mt-1 text-[10px] text-zinc-500">
                  Скопіюйте зображення на Batcave та натисніть Ctrl+V у полі обкладинки.
                </p>
                <label className="block text-[11px] font-semibold text-zinc-300 mt-2 mb-1">
                  Або виберіть файл обкладинки
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFile}
                  className="w-full text-[11px] text-zinc-400 file:mr-2 file:rounded-md file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-200 hover:file:bg-zinc-700"
                />
                <p className="mt-1 text-[10px] text-zinc-500">Файл буде зменшено для збереження разом із коміксом.</p>
                {coverUploadError && <p className="mt-1 text-[10px] text-rose-400">{coverUploadError}</p>}
              </div>
            </div>
          </div>

          {/* Series URL vs Reading URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Постійне посилання на серію (Series URL)
              </label>
              <input
                type="url"
                value={seriesUrl}
                onChange={(e) => setSeriesUrl(e.target.value)}
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Посилання на поточне місце (Reading URL)
              </label>
              <input
                type="url"
                value={readingUrl}
                onChange={(e) => handleReadingUrlChange(e.target.value)}
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Progress row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Поточний випуск
              </label>
              <input
                type="text"
                value={currentIssue}
                onChange={(e) => setCurrentIssue(e.target.value)}
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Поточна сторінка
              </label>
              <input
                type="number"
                min="1"
                value={currentPage}
                onChange={(e) => setCurrentPage(e.target.value)}
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Усього випусків
              </label>
              <input
                type="number"
                min="1"
                value={totalIssues}
                onChange={(e) => setTotalIssues(e.target.value)}
                placeholder="порожньо, якщо невідомо"
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Publisher, Priority, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Видавництво
              </label>
              <select
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {publishers.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
              {publisher === 'Інше' && (
                <input
                  type="text"
                  required
                  value={customPublisher}
                  onChange={(e) => setCustomPublisher(e.target.value)}
                  placeholder="Введіть видавництво..."
                  className="w-full mt-1.5 bg-[#181a29] border border-white/10 rounded-lg px-2.5 py-1 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500"
                />
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Пріоритет
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {priorities.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
                Статус
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-[#181a29] border border-white/10 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {statuses.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-zinc-300">
                Теги (максимум 5)
              </label>
              <span className="text-[11px] text-zinc-500">
                {tags.length}/5
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 min-h-[30px] p-2 bg-[#181a29] border border-white/10 rounded-lg">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-md bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs flex items-center gap-1 font-medium"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-white cursor-pointer ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {tags.length < 5 && (
                <div className="flex-1 min-w-[120px] flex items-center gap-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    placeholder={tags.length === 0 ? 'Введіть тег та натисніть Enter' : 'Додати ще...'}
                    className="w-full bg-transparent border-none text-zinc-200 text-xs focus:outline-none placeholder:text-zinc-600"
                  />
                  {String(tagInput || '').trim() && (
                    <button
                      type="button"
                      onClick={() => handleAddTag(tagInput)}
                      className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {tagSuggestions.length > 0 && tags.length < 5 && (
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] text-zinc-500 mr-1">Підказки:</span>
                {tagSuggestions.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleAddTag(st.name)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-white/5 cursor-pointer transition-colors"
                  >
                    + {st.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Folders */}
          {folders && folders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Папки</span>
                </label>
                <span className="text-[10px] text-zinc-500">
                  Обрано: {selectedFolderIds.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2 bg-[#181a29] border border-white/10 rounded-lg max-h-28 overflow-y-auto custom-scrollbar">
                {folders.map((col) => {
                  const isChecked = selectedFolderIds.includes(col.id);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => {
                        setSelectedFolderIds((prev) =>
                          isChecked ? prev.filter((id) => id !== col.id) : [...prev, col.id]
                        );
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                          : 'bg-zinc-800/60 text-zinc-400 border-white/5 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-white/20 bg-black/20'
                        }`}
                      >
                        {isChecked && <Check className="w-2.5 h-2.5" />}
                      </span>
                      <span>{col.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Free-text Note */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 mb-1">
              Персональна нотатка
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Враження, на якому розділі зупинився..."
              className="w-full bg-[#181a29] border border-white/10 rounded-lg p-2.5 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 placeholder:text-zinc-600"
            />
          </div>

          {submitError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#161826] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Скасувати
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e)}
            disabled={isSubmitting || !String(title || '').trim()}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Збереження...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Зберегти зміни</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
