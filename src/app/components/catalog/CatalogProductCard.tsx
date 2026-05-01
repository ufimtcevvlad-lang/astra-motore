"use client";

import Link from "next/link";
import { memo, useCallback, useState } from "react";
import { ProductImage } from "../ProductImage";
import { useFavorites } from "../FavoritesContext";
import type { Product } from "../../lib/products-types";
import { productPath } from "../../lib/product-slug";
import { watermarkedImageUrl } from "../../lib/watermark-images";

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Единая карточка товара: витрина, каталог, посадочные страницы */
export const CatalogProductCard = memo(function CatalogProductCard({
  p,
  variant = "grid",
}: {
  p: Product;
  variant?: "grid" | "list";
}) {
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const liked = isFavorite(p.id);
  const urls = p.images && p.images.length > 0 ? p.images : [p.image];
  const [active, setActive] = useState(0);
  const n = urls.length;
  const idx = n > 0 ? active % n : 0;
  const src = urls[idx] ?? p.image;
  const cardSrc = watermarkedImageUrl(src, "card");

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n < 2) return;
      setActive((i) => (i + dir + n) % n);
    },
    [n],
  );

  const galleryChrome =
    "transition-opacity duration-200 max-md:opacity-100 max-md:pointer-events-auto md:opacity-0 md:pointer-events-none md:group-hover/card:opacity-100 md:group-hover/card:pointer-events-auto md:group-focus-within/card:opacity-100 md:group-focus-within/card:pointer-events-auto";
  const galleryBadgeOpacity =
    "transition-opacity duration-200 max-md:opacity-100 md:opacity-0 md:group-hover/card:opacity-100 md:group-focus-within/card:opacity-100";

  const heartButton = (
    <button
      type="button"
      aria-label={liked ? "Убрать из избранного" : "В избранное"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(p.id);
      }}
      className={`absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full transition ${
        liked
          ? "bg-red-50 text-red-500 shadow-sm"
          : "bg-white/80 text-slate-400 shadow-sm backdrop-blur-sm hover:text-red-400"
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  const imageBlock = (
    <div className={`relative overflow-hidden bg-white ${variant === "list" ? "aspect-square w-28 shrink-0 sm:w-36" : "aspect-square"}`}>
      {heartButton}
      <Link
        href={productPath(p)}
        className="absolute inset-2 z-0 block"
        aria-label={`${p.name}, арт. ${p.sku} — подробнее`}
      >
        <ProductImage
          key={src}
          src={cardSrc}
          alt={
            n > 1
              ? `${p.name}, арт. ${p.sku} — фото ${idx + 1} из ${n}`
              : `${p.name}, арт. ${p.sku}`
          }
          fill
          className="object-contain object-center"
          sizes={variant === "list" ? "144px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
        />
      </Link>
      {n > 1 ? (
        <>
          <button
            type="button"
            aria-label="Предыдущее фото"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(-1);
            }}
            className={`absolute left-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/55 text-white shadow-md backdrop-blur-sm transition hover:bg-slate-900/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${galleryChrome}`}
          >
            <ChevronLeft className="ml-[-1px]" />
          </button>
          <button
            type="button"
            aria-label="Следующее фото"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(1);
            }}
            className={`absolute right-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/55 text-white shadow-md backdrop-blur-sm transition hover:bg-slate-900/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${galleryChrome}`}
          >
            <ChevronRight className="mr-[-1px]" />
          </button>
          <div
            className={`pointer-events-none absolute bottom-1.5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-slate-900/50 px-2 py-0.5 text-[10px] font-semibold text-white tabular-nums backdrop-blur-sm ${galleryBadgeOpacity}`}
            aria-hidden
          >
            {idx + 1}/{n}
          </div>
        </>
      ) : null}
    </div>
  );

  if (variant === "list") {
    return (
      <article className="group/card rounded-xl bg-white shadow-md border border-slate-200/90 flex overflow-hidden hover:shadow-lg hover:border-amber-400/50 transition">
        {imageBlock}
        <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4 min-w-0">
          <span className="inline-flex w-fit rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
            {p.category}
          </span>
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{p.name}</h2>
          <p className="text-xs text-slate-600">Арт. {p.sku}</p>
          <p className="line-clamp-1 text-xs text-slate-500">{p.car}</p>
          <div className="mt-auto flex items-center gap-3 pt-1">
            <p className="text-lg font-bold text-amber-700 tabular-nums">
              {p.price.toLocaleString("ru-RU")} ₽
            </p>
            <Link
              href={productPath(p)}
              className="inline-flex rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-300"
            >
              Подробнее
            </Link>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group/card rounded-xl bg-white shadow-md border border-slate-200/90 flex flex-col overflow-hidden hover:shadow-lg hover:border-amber-400/50 transition">
      {imageBlock}
      <div className="flex flex-1 flex-col gap-2 border-t border-slate-100 p-4">
        <span className="inline-flex w-fit rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900">
          {p.category}
        </span>
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{p.name}</h2>
        <p className="text-lg font-bold text-amber-700 tabular-nums">
          {p.price.toLocaleString("ru-RU")} ₽
        </p>
        <p className="line-clamp-1 text-xs text-slate-500">{p.car}</p>
        <p className="text-xs text-slate-600">Арт. {p.sku}</p>
        <div className="mt-auto pt-1">
          <Link
            href={productPath(p)}
            className="inline-flex w-full justify-center rounded-lg bg-amber-400 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-300"
          >
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  );
});
