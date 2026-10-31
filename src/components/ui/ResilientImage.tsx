import { useState } from 'react';
import { Gem } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  fallbackLabel?: string;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
}

export function ResilientImage({
  src,
  alt,
  fallbackLabel,
  className = '',
  containerClassName = '',
  priority = false,
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-surface text-muted p-6 text-center select-none ${containerClassName}`}
        role="img"
        aria-label={alt}
      >
        <Gem className="w-7 h-7 text-primary/70 stroke-[1.25] mb-3" aria-hidden="true" />
        <span className="font-serif italic text-base text-foreground/85 max-w-[20ch]">
          {fallbackLabel || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
