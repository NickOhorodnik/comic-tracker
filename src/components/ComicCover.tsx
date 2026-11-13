import React, { useState, useEffect } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';

interface ComicCoverProps {
  src?: string;
  alt: string;
  className?: string;
  aspectRatioClass?: string;
}

export const ComicCover: React.FC<ComicCoverProps> = ({
  src,
  alt,
  className = '',
  aspectRatioClass = 'aspect-[2/3]',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const cleanSrc = (src || '').trim();

  // Reset error and loaded state whenever cleanSrc changes or manual retry is triggered
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [cleanSrc, retryCount]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setHasError(false);
    setIsLoaded(false);
    setRetryCount((prev) => prev + 1);
  };

  // If no source or broken image
  if (!cleanSrc || hasError) {
    return (
      <div
        className={`${aspectRatioClass} ${className} bg-gradient-to-br from-[#1b1e2e] via-[#141622] to-[#0d0e17] border border-white/10 rounded-md flex flex-col items-center justify-center p-2 text-center text-zinc-500 overflow-hidden relative select-none group/cover`}
      >
        <BookOpen className="w-6 h-6 mb-1 text-zinc-600 opacity-60" />
        <span className="text-[11px] font-medium leading-tight text-zinc-400 line-clamp-2 px-1">
          {alt || 'Без обкладинки'}
        </span>
        {cleanSrc && (
          <button
            type="button"
            onClick={handleRetry}
            className="mt-1.5 px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-[10px] text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
            title="Спробувати завантажити знову"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>Оновити</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`${aspectRatioClass} ${className} relative overflow-hidden rounded-md bg-[#13151f] border border-white/5 flex items-center justify-center`}
    >
      {!isLoaded && (
        <div className="absolute inset-0 bg-zinc-800/40 animate-pulse flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-zinc-600" />
        </div>
      )}
      <img
        key={`${cleanSrc}_${retryCount}`}
        src={cleanSrc}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

