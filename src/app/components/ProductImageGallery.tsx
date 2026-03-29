"use client";

import { useCallback, useRef, useState } from "react";
import { ProductImage } from "./ProductImage";

type Props = {
  alt: string;
  urls: string[];
};

/** Рамка ближе к портрету + object-cover — без пустых полос по бокам у вертикальных фото */
const STAGE =
  "relative w-full max-w-[min(100%,440px)] mx-auto aspect-[3/4] sm:aspect-[4/5] overflow-hidden rounded-lg bg-slate-200 shadow-inner";

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProductImageGallery({ alt, urls }: Props) {
  const list = urls.filter(Boolean);
  const [active, setActive] = useState(0);
  const current = list[active] ?? list[0];
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (list.length < 2) return;
      setActive((i) => (i + dir + list.length) % list.length);
    },
    [list.length],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null || list.length < 2) return;
    const x = e.changedTouches[0].clientX;
    const dx = x - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 48) return;
    if (dx < 0) go(1);
    else go(-1);
  };

  if (list.length === 0) {
    return <div className={`${STAGE} bg-slate-100`} aria-hidden />;
  }

  const stage = (
    <div
      className={`group/stage ${STAGE}`}
      tabIndex={list.length > 1 ? 0 : undefined}
      onKeyDown={
        list.length > 1
          ? (e) => {
              if (e.key === "ArrowLeft") {
                e.preventDefault();
                go(-1);
              }
              if (e.key === "ArrowRight") {
                e.preventDefault();
                go(1);
              }
            }
          : undefined
      }
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role={list.length > 1 ? "region" : undefined}
      aria-roledescription={list.length > 1 ? "Галерея фотографий" : undefined}
      aria-label={list.length > 1 ? `${alt}, фото ${active + 1} из ${list.length}. Стрелки или свайп для переключения.` : undefined}
    >
      <ProductImage
        key={current}
        src={current}
        alt={list.length > 1 ? `${alt} — фото ${active + 1} из ${list.length}` : alt}
        fill
        className="object-cover object-center"
        sizes="(max-width: 768px) 100vw, 440px"
        quality={85}
      />

      {list.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Предыдущее фото"
            onClick={() => go(-1)}
            className="absolute left-1.5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/55 text-white shadow-md backdrop-blur-sm transition hover:bg-slate-900/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 md:opacity-0 md:group-hover/stage:opacity-100"
          >
            <ChevronLeft className="ml-[-2px]" />
          </button>
          <button
            type="button"
            aria-label="Следующее фото"
            onClick={() => go(1)}
            className="absolute right-1.5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/55 text-white shadow-md backdrop-blur-sm transition hover:bg-slate-900/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 md:opacity-0 md:group-hover/stage:opacity-100"
          >
            <ChevronRight className="mr-[-2px]" />
          </button>
          <div
            className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-900/45 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
            aria-hidden
          >
            {active + 1} / {list.length}
          </div>
        </>
      ) : null}
    </div>
  );

  if (list.length === 1) {
    return stage;
  }

  return (
    <div className="space-y-3">
      {stage}
      <div className="flex flex-wrap justify-center gap-2 sm:justify-start" role="tablist" aria-label="Миниатюры фотографий">
        {list.map((src, idx) => (
          <button
            key={`${src}-${idx}`}
            type="button"
            role="tab"
            aria-selected={idx === active}
            aria-label={`Показать фото ${idx + 1}`}
            onClick={() => setActive(idx)}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
              idx === active ? "border-amber-500 ring-1 ring-amber-400/40" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <ProductImage src={src} alt="" fill className="object-cover" sizes="64px" quality={60} />
          </button>
        ))}
      </div>
    </div>
  );
}
