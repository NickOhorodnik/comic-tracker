import React, { useState } from 'react';
import {
  Sheet,
  X,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  AlertCircle,
  UploadCloud,
  CheckCircle2,
  Code2,
} from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../lib/googleAppsScriptTemplate.ts';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedUrl: string;
  onSaveUrl: (url: string) => Promise<void>;
  onPushAllComics: () => Promise<void>;
  comicsCount: number;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  savedUrl,
  onSaveUrl,
  onPushAllComics,
  comicsCount,
}) => {
  const [urlInput, setUrlInput] = useState(savedUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [showCodePreview, setShowCodePreview] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestAndSave = async () => {
    let targetUrl = urlInput.trim();
    if (!targetUrl) {
      await onSaveUrl('');
      setTestResult({ success: true, message: 'Перемкнено в автономний локальний режим.' });
      return;
    }

    // Auto-correct /dev to /exec
    if (targetUrl.endsWith('/dev')) {
      targetUrl = targetUrl.replace(/\/dev$/, '/exec');
      setUrlInput(targetUrl);
    }

    // Proactive check for Spreadsheet URL
    if (targetUrl.includes('docs.google.com/spreadsheets')) {
      setTestResult({
        success: false,
        message:
          'Ви вказали посилання на саму Google Таблицю (docs.google.com), а не на веб-програму Apps Script! Для безпечного запису без розкриття приватних ключів Google вимагає розгорнуту веб-програму. Відкрийте цю таблицю → меню «Розширення» (Extensions) → «Apps Script», вставте наш готовий код і натисніть «Розгорнути» (Deploy) як Веб-програму з доступом «Усі» (Anyone). Отримане посилання (.../exec) вставте сюди.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const proxyUrl = `/api/sheets-proxy?scriptUrl=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(proxyUrl);
      const json = await res.json();

      if (json && json.status === 200 && json.data && json.data.success) {
        await onSaveUrl(targetUrl);
        const hasCollections = json.data.data && Array.isArray(json.data.data.collections);
        setTestResult({
          success: true,
          message: hasCollections
            ? 'Зʼєднання успішне! Таблицю підключено, підтримку колонок папок «[Папка]» перевірено.'
            : 'Зʼєднання успішне! У таблиці працює попередня версія скрипта. Для підтримки колонок папок скопіюйте оновлений код та оберіть: Deploy → Manage deployments → Edit → New version.',
        });
      } else {
        const errorMsg =
          json?.error ||
          (json?.data && json.data.error) ||
          'Не вдалося підключитися до Google Apps Script. Перевірте доступ «Усі» (Anyone).';
        setTestResult({
          success: false,
          message: errorMsg,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Не вдалося підключитися через мережу: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePushAll = async () => {
    setIsPushing(true);
    setPushSuccess(false);
    try {
      await onPushAllComics();
      setPushSuccess(true);
      setTimeout(() => setPushSuccess(false), 3000);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Помилка вивантаження: ${err.message}`,
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#121420] border border-white/10 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col text-xs text-zinc-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#161826]">
          <div className="flex items-center gap-2">
            <Sheet className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Синхронізація з Google Sheets
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
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-120px)] space-y-5">
          {/* Status banner */}
          <div className="p-4 rounded-xl bg-[#181a29] border border-white/5 flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                savedUrl
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              <Sheet className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-white text-xs">
                {savedUrl ? 'Google Таблиця активна' : 'Працює в автономному локальному режимі'}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                {savedUrl
                  ? 'Всі операції додавання, редагування, прогресу, а також папки (сторінка COLLECTIONS та колонка folders у COMICS) синхронізуються безпосередньо з вашою Google Таблицею.'
                  : 'Зараз дані збережено у вашому браузері. Підключіть Google Sheets, щоб папки зберігалися у вкладці COLLECTIONS і колонці folders таблиці COMICS.'}
              </p>
            </div>
          </div>

          {/* Folders in Sheets Highlight */}
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-start gap-2.5 text-[11px]">
            <Code2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white block">
                📁 Збереження папок: окрема сторінка COLLECTIONS + колонка folders у COMICS
              </span>
              <p className="text-zinc-300 leading-relaxed">
                Кожна папка створюється як запис на окремій сторінці <strong>COLLECTIONS</strong>, а в основній таблиці <strong>COMICS</strong> колонка <strong>folders</strong> відображає список папок кожного коміксу. Завдяки цьому ваші збірки надійно зберігаються в Google Sheets і не зникнуть при очищенні кешу браузера.
              </p>
            </div>
          </div>

          {/* Step-by-step Setup Guide */}
          <div className="space-y-3">
            <h3 className="font-bold text-zinc-200 text-xs flex items-center justify-between">
              <span>Як підключити власну Google Таблицю (1 хвилина):</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Код скопійовано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Скопіювати готовий скрипт</span>
                  </>
                )}
              </button>
            </h3>

            <ol className="list-decimal list-inside space-y-2 text-[11px] text-zinc-400 bg-[#161826] p-4 rounded-xl border border-white/5 leading-relaxed">
              <li>
                Створіть нову порожню таблицю на{' '}
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline inline-flex items-center gap-0.5 font-medium"
                >
                  sheets.new <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </li>
              <li>
                У меню таблиці відкрийте <strong className="text-zinc-200">Розширення (Extensions)</strong> →{' '}
                <strong className="text-zinc-200">Apps Script</strong>.
              </li>
              <li>
                Вставте скопійований готовий код і натисніть <strong className="text-zinc-200">Зберегти</strong> (Ctrl+S).
              </li>
              <li>
                Натисніть <strong className="text-zinc-200">Розгорнути (Deploy)</strong> →{' '}
                <strong className="text-zinc-200">Нове розгортання (New deployment)</strong>.
                <span className="block text-[10px] text-zinc-400 mt-0.5 pl-4">
                  (Якщо розгортання вже було створено раніше: оберіть <strong>Керування розгортаннями (Manage deployments)</strong> → іконка олівця <strong>Редагувати</strong> → у списку Версія оберіть <strong>«Нова версія»</strong> → <strong>Розгорнути</strong>).
                </span>
              </li>
              <li>
                Оберіть тип: <strong className="text-zinc-200">Веб-програма (Web app)</strong>. У полі Доступ (Who has access) обов'язково встановіть{' '}
                <strong className="text-emerald-400">Усі (Anyone)</strong>.
              </li>
              <li>
                Скопіюйте отриманий <strong className="text-zinc-200">URL веб-програми</strong> (закінчується на <code className="text-zinc-300">/exec</code>) і вставте його в поле нижче.
              </li>
            </ol>

            {/* Redeployment Alert Helper */}
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300 leading-relaxed">
              <span className="font-bold text-white block mb-0.5">
                ⚡ Важливо при зміні або оновленні коду скрипта:
              </span>
              Google Apps Script вимагає збереження нової версії розгортання після кожної зміни коду. Якщо ви просто замінили код і не створили нову версію, веб-програма продовжує виконувати старий код і видає помилку <em>«Не удалось найти функцию: doGet»</em>. Для оновлення: <strong>Deploy → Manage deployments → Edit (олівець) → Version: «New version» → Deploy</strong>. Доступ змінювати не потрібно, URL залишиться тим самим.
            </div>
          </div>

          {/* URL Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-zinc-300 text-xs">
                URL розгортання Google Apps Script (Web App URL)
              </label>
              {urlInput.trim().endsWith('/dev') && (
                <button
                  type="button"
                  onClick={() => setUrlInput(urlInput.trim().replace(/\/dev$/, '/exec'))}
                  className="text-[10px] text-amber-400 hover:underline font-medium cursor-pointer"
                >
                  Замінити /dev на /exec
                </button>
              )}
            </div>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full bg-[#181a29] border border-white/10 rounded-lg px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
            />

            {/* Live helper warnings */}
            {urlInput.includes('docs.google.com/spreadsheets') && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] leading-relaxed">
                <span className="font-semibold block mb-0.5">⚠️ Вказано посилання на саму Google Таблицю (docs.google.com)</span>
                Потрібен URL веб-програми Apps Script (<code className="text-zinc-200">/exec</code>). Скопіюйте готовий скрипт вище, відкрийте меню цієї таблиці <strong className="text-white">«Розширення» → «Apps Script»</strong>, вставте код та розгорніть з доступом «Усі».
              </div>
            )}

            {urlInput.trim().endsWith('/dev') && (
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                💡 Посилання закінчується на <code>/dev</code> (режим розробника з обовʼязковим входом). Ми автоматично перетворимо його на <code>/exec</code> при збереженні.
              </div>
            )}
          </div>

          {/* Test & Result Messages */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-[11px] flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Sync actions if connected */}
          {savedUrl && (
            <div className="p-4 rounded-xl bg-[#161826] border border-white/5 space-y-3">
              <div className="font-semibold text-zinc-200 text-xs">
                Дії з поточною бібліотекою:
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handlePushAll}
                  disabled={isPushing}
                  className="px-3 py-1.5 rounded-lg bg-[#202336] hover:bg-[#292d45] text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                >
                  {isPushing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : pushSuccess ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <UploadCloud className="w-3.5 h-3.5 text-indigo-400" />
                  )}
                  <span>
                    {pushSuccess
                      ? 'Успішно вивантажено!'
                      : `Вивантажити ${comicsCount} коміксів у Google Sheets`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Code Viewer toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowCodePreview(!showCodePreview)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
            >
              <Code2 className="w-3 h-3 text-indigo-400" />
              <span>{showCodePreview ? 'Приховати код Apps Script' : 'Переглянути код Apps Script'}</span>
            </button>

            {showCodePreview && (
              <div className="mt-2 p-3 bg-black/60 border border-white/10 rounded-lg max-h-48 overflow-y-auto font-mono text-[10px] text-zinc-300 leading-relaxed">
                <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-[#161826] flex items-center justify-between">
          {savedUrl ? (
            <button
              type="button"
              onClick={async () => {
                setUrlInput('');
                await onSaveUrl('');
                setTestResult({ success: true, message: 'Google Таблицю відключено.' });
              }}
              className="text-xs text-rose-400 hover:underline cursor-pointer"
            >
              Відключити таблицю
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            >
              Закрити
            </button>

            <button
              type="button"
              onClick={handleTestAndSave}
              disabled={isTesting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white font-medium text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Перевірка...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Зберегти та перевірити</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
