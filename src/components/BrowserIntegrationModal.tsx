import React from 'react';
import {
  X,
  Globe,
  Download,
  Settings,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  MousePointer2,
} from 'lucide-react';

interface BrowserIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  extensionStatus: 'connected' | 'not_detected' | 'unknown';
}

export const BrowserIntegrationModal: React.FC<BrowserIntegrationModalProps> = ({
  isOpen,
  onClose,
  extensionStatus,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#121420] border border-white/10 rounded-2xl w-full max-w-xl my-8 overflow-hidden shadow-2xl flex flex-col text-xs text-zinc-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#161826]">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">
              Інтеграція з браузером
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
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)] space-y-6">
          {/* Status Section */}
          <div className="bg-[#161826] border border-white/5 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                extensionStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {extensionStatus === 'connected' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 font-medium">Статус розширення</p>
                <p className="text-sm font-bold text-white">
                  {extensionStatus === 'connected' ? 'Підключено' : 'Не виявлено'}
                </p>
              </div>
            </div>
            {extensionStatus === 'connected' && (
              <div className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                ACTIVE
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider text-zinc-500">
              Про Comic Tracker Bridge
            </h3>
            <p className="text-zinc-400 leading-relaxed">
              Comic Tracker Bridge — це розширення для браузера, яке автоматично відстежує ваш прогрес читання на сайтах коміксів і синхронізує його з вашою бібліотекою.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <li className="flex items-center gap-2 text-[11px] text-zinc-300 bg-white/5 p-2 rounded-lg border border-white/5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Авто-синхронізація прогресу</span>
              </li>
              <li className="flex items-center gap-2 text-[11px] text-zinc-300 bg-white/5 p-2 rounded-lg border border-white/5">
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Швидкий імпорт коміксів</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider text-zinc-500">
              Інструкція з встановлення
            </h3>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">1</div>
                <div>
                  <p className="font-semibold text-zinc-200">Завантажте папку розширення</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Отримайте файли розширення (папка `extension`) з репозиторію проекту.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">2</div>
                <div>
                  <p className="font-semibold text-zinc-200">Відкрийте сторінку розширень</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Перейдіть за адресою <code className="text-indigo-400">chrome://extensions</code> або в меню "Керування розширеннями".</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">3</div>
                <div>
                  <p className="font-semibold text-zinc-200">Увімкніть "Режим розробника"</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Активуйте перемикач "Developer mode" у правому верхньому куті.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">4</div>
                <div>
                  <p className="font-semibold text-zinc-200">Завантажте розширення</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Натисніть "Load unpacked" і виберіть папку <code className="text-indigo-400">extension</code>.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-3">
            <h4 className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
              <AlertCircle className="w-3.5 h-3.5" />
              Вирішення проблем
            </h4>
            <ul className="space-y-2 text-[11px] text-zinc-400">
              <li className="flex gap-2">
                <span className="text-amber-500/50 mt-0.5">•</span>
                <span><strong className="text-zinc-300">Розширення не знайдено?</strong> Переконайтеся, що ви відкрили підтримуваний сайт коміксів і оновили сторінку.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500/50 mt-0.5">•</span>
                <span><strong className="text-zinc-300">Сайт не підтримується?</strong> Розширення працює на com-x.life, batcave.biz та інших. Якщо сайт не розпізнається, спробуйте оновити розширення.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500/50 mt-0.5">•</span>
                <span><strong className="text-zinc-300">Помилка дозволів?</strong> При першому запуску браузер може запитати дозвіл на доступ до сайту.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#161826] flex items-center justify-between">
          <p className="text-[10px] text-zinc-500">
            Comic Tracker Bridge v1.0.0 • Unpacked Distribution
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Зрозуміло
          </button>
        </div>
      </div>
    </div>
  );
};
