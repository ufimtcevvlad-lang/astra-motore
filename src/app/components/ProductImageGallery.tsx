"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ProductImage } from "./ProductImage";

type Props = {
  alt: string;
  urls: string[];
};

/** Единый квадрат, белый фон, contain — деталь целиком (фотобокс). См. .cursor/skills/catalog-product-media */
const STAGE =
  "relative w-full max-w-[min(100%,440px)] mx-auto aspect-square overflow-hidden rounded-lg bg-white border border-slate-200/90 shadow-inner";

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

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function ProductImageGallery({ alt, urls }: Props) {
  const list = urls.filter(Boolean);
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const current = list[active] ?? list[0];
  const touchStartX = useRef<number | null>(null);
  const lightboxTouchStartX = useRef<number | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (list.length > 1 && e.key === "ArrowLeft") {
        e.preventDefault();
        setActive((i) => (i - 1 + list.length) % list.length);
      }
      if (list.length > 1 && e.key === "ArrowRight") {
        e.preventDefault();
        setActive((i) => (i + 1) % list.length);
      }
    };
    document.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [lightboxOpen, list.length]);

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

  const onLightboxTouchStart = (e: React.TouchEvent) => {
    lightboxTouchStartX.current = e.touches[0].clientX;
  };

  const onLightboxTouchEnd = (e: React.TouchEvent) => {
    if (lightboxTouchStartX.current == null || list.length < 2) return;
    const x = e.changedTouches[0].clientX;
    const dx = x - lightboxTouchStartX.current;
    lightboxTouchStartX.current = null;
    if (Math.abs(dx) < 56) return;
    if (dx < 0) go(1);
    else go(-1);
  };

  const lightbox =
    mounted && lightboxOpen
      ? createPortal(
          <div
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={`Просмотр: ${list.length > 1 ? `фото ${active + 1} из ${list.length}` : alt}`}
            onClick={() => setLightboxOpen(false)}
          >
            <button
              ref={closeBtnRef}
              type="button"
              aria-label="Закрыть"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
              className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:right-5 sm:top-5"
            >
              <CloseIcon className="h-6 w-6" />
            </button>

            {list.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label="Предыдущее фото"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(-1);
                  }}
                  className="absolute left-2 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:left-4"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <button
                  type="button"
                  aria-label="Следующее фото"
                  onClick={(e) => {
                    e.stopPropagation();
                    go(1);
                  }}
                  className="absolute right-2 top-1/2 z-20 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:right-4"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
                <div
                  className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm"
                  aria-hidden
                >
                  {active + 1} / {list.length}
                </div>
              </>
            ) : null}

            <div
              className="relative mx-auto h-[min(85dvh,calc(100dvh-4rem))] w-full max-w-[min(100vw-1rem,100dvh)] touch-pan-y sm:h-[min(90dvh,calc(100dvh-3rem))]"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={onLightboxTouchStart}
              onTouchEnd={onLightboxTouchEnd}
            >
              <ProductImage
                key={current}
                src={current}
                alt={list.length > 1 ? `${alt} — фото ${active + 1} из ${list.length}` : alt}
                fill
                className="object-contain object-center"
                sizes="100vw"
                quality={92}
              />
            </div>
          </div>,
          document.body,
        )
      : null;

  if (list.length === 0) {
    return <div className={STAGE} aria-hidden />;
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
      <div className="absolute inset-3">
        <div className="relative h-full w-full">
          <ProductImage
            key={current}
            src={current}
            alt={list.length > 1 ? `${alt} — фото ${active + 1} из ${list.length}` : alt}
            fill
            className="pointer-events-none object-contain object-center"
            sizes="(max-width: 768px) 100vw, 440px"
            quality={85}
          />
          <button
            type="button"
            className="absolute inset-0 z-[5] cursor-zoom-in rounded-md bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            aria-label="Открыть фото на весь экран"
            onClick={() => setLightboxOpen(true)}
          />
        </div>
      </div>

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
    return (
      <>
        {stage}
        {lightbox}
      </>
    );
  }

  return (
    <div className="space-y-3">
      {stage}
      {lightbox}
      <div className="flex flex-wrap justify-center gap-2 sm:justify-start" role="tablist" aria-label="Миниатюры фотографий">
        {list.map((src, idx) => (
          <button
            key={`${src}-${idx}`}
            type="button"
            role="tab"
            aria-selected={idx === active}
            aria-label={`Показать фото ${idx + 1}`}
            onClick={() => setActive(idx)}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
              idx === active ? "border-amber-500 ring-1 ring-amber-400/40" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="absolute inset-1">
              <ProductImage src={src} alt="" fill className="object-contain object-center" sizes="64px" quality={60} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
