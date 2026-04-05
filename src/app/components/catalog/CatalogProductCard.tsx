"use client";

import Link from "next/link";
import { memo, useCallback, useState } from "react";
import { ProductImage } from "../ProductImage";
import { getProductImageUrls, type Product } from "../../data/products";

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
export const CatalogProductCard = memo(function CatalogProductCard({ p }: { p: Product }) {
  const urls = getProductImageUrls(p);
  const [active, setActive] = useState(0);
  const n = urls.length;
  const idx = n > 0 ? active % n : 0;
  const src = urls[idx] ?? p.image;

  const go = useCallback(
    (dir: -1 | 1) => {
      if (n < 2) return;
      setActive((i) => (i + dir + n) % n);
    },
    [n],
  );

  return (
    <article className="rounded-xl bg-white shadow-md border border-slate-200/90 flex flex-col overflow-hidden hover:shadow-lg hover:border-amber-400/50 transition">
      <div className="relative aspect-square overflow-hidden bg-white group/card">
        <Link
          href={`/product/${p.id}`}
          className="absolute inset-3 z-0 block"
          aria-label={`${p.name}, арт. ${p.sku} — подробнее`}
        >
          <ProductImage
            key={src}
            src={src}
            alt={
              n > 1
                ? `${p.name}, арт. ${p.sku} — фото ${idx + 1} из ${n}`
                : `${p.name}, арт. ${p.sku}`
            }
            fill
            className="object-contain object-center"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
              className="absolute left-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/55 text-white shadow-md backdrop-blur-sm transition hover:bg-slate-900/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
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
              className="absolute right-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/55 text-white shadow-md backdrop-blur-sm transition hover:bg-slate-900/75 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <ChevronRight className="mr-[-1px]" />
            </button>
            <div
              className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-slate-900/50 px-2 py-0.5 text-[10px] font-semibold text-white tabular-nums backdrop-blur-sm"
              aria-hidden
            >
              {idx + 1}/{n}
            </div>
          </>
        ) : null}
      </div>
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
            href={`/product/${p.id}`}
            className="inline-flex w-full justify-center rounded-lg bg-amber-400 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-300"
          >
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  );
});
