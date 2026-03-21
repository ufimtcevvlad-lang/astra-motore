"use client";

import Link from "next/link";
import type { Product } from "../data/products";
import { ProductImage } from "./ProductImage";

export function HomeFeatured({ items }: { items: Product[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Популярные позиции</h2>
          <p className="text-sm text-slate-600 mt-1">Примеры из каталога — цены и наличие на карточке</p>
        </div>
        <Link
          href="/catalog"
          className="text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline"
        >
          Смотреть весь каталог →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <article
            key={p.id}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:border-amber-400/70 hover:shadow-md transition flex flex-col"
          >
            <Link href={`/product/${p.id}`} className="block aspect-[4/3] relative bg-slate-100">
              <ProductImage
                src={p.image}
                alt={p.name}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </Link>
            <div className="p-4 flex flex-col gap-2 flex-1">
              <h3 className="font-semibold text-sm text-slate-900 line-clamp-2">{p.name}</h3>
              <p className="text-xs text-slate-500">{p.brand}</p>
              <p className="text-base font-bold text-amber-700">{p.price.toLocaleString("ru-RU")} ₽</p>
              <Link
                href={`/product/${p.id}`}
                className="mt-auto inline-flex justify-center rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300 transition"
              >
                В карточку товара
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
