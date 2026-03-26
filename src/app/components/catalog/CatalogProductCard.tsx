"use client";

import Link from "next/link";
import { memo } from "react";
import { ProductImage } from "../ProductImage";
import type { Product } from "../../data/products";

/** Единая карточка товара: витрина, каталог, посадочные страницы */
export const CatalogProductCard = memo(function CatalogProductCard({ p }: { p: Product }) {
  const isOriginal = /gm|oe|ориг/i.test(p.brand);
  const isHit = Number.parseInt(String(p.id).replace(/\D/g, ""), 10) % 5 === 0;
  const inStockLabel = p.inStock > 20 ? "В наличии" : "Мало";

  return (
    <article className="rounded-xl bg-white shadow-md border border-slate-200/90 flex flex-col overflow-hidden hover:shadow-lg hover:border-amber-400/50 transition">
      <Link href={`/product/${p.id}`} className="block aspect-[4/3] relative bg-slate-100 overflow-hidden">
        <ProductImage
          src={p.image}
          alt={p.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        <div className="pointer-events-none absolute inset-x-2 top-2 flex flex-wrap gap-1.5">
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50/95 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
            {inStockLabel}
          </span>
          {isOriginal ? (
            <span className="inline-flex rounded-full border border-amber-300 bg-amber-50/95 px-2.5 py-1 text-[10px] font-semibold text-amber-900">
              Оригинал
            </span>
          ) : null}
          {isHit ? (
            <span className="inline-flex rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
              Хит
            </span>
          ) : null}
        </div>
      </Link>
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
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="text-amber-500">✓</span>
            Проверено
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="text-amber-500">✓</span>
            Подбор по VIN
          </span>
        </div>
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
