'use client';

import { useEffect, useState } from 'react';

type PhotoCarouselProps = {
  images: string[];
  intervalMs?: number;
};

export function PhotoCarousel({ images, intervalMs = 3600 }: PhotoCarouselProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [images.length, intervalMs]);

  return (
    <div className="w-full max-w-sm">
      <div className="relative aspect-square w-full overflow-hidden rounded-card bg-neutral-100">
        {images.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
              i === index ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
        {images.map((src, i) => (
          <span key={src} className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-brand' : 'bg-neutral-300'}`} />
        ))}
      </div>
    </div>
  );
}
