"use client";

import Link from "next/link";
import { ProductImage } from "../ProductImage";
import type { Product } from "../../data/products";

/** Единая карточка товара: витрина, каталог, посадочные страницы */
export function CatalogProductCard({ p }: { p: Product }) {
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
      </Link>
      <div className="p-4 flex flex-col gap-2 flex-1 border-t border-slate-100">
        <h2 className="font-semibold text-sm text-slate-900 line-clamp-2">{p.name}</h2>
        <p className="text-xs text-amber-800/90 font-medium">{p.category}</p>
        <p className="text-xs text-slate-500">
          {p.brand} • {p.car}
        </p>
        <p className="text-sm font-bold text-amber-700">
          {p.price.toLocaleString("ru-RU")} ₽
        </p>
        <p className="text-xs text-slate-500">
          Артикул: {p.sku} • В наличии: {p.inStock}
        </p>
        <div className="mt-auto pt-2">
          <Link
            href={`/product/${p.id}`}
            className="inline-flex w-full justify-center rounded-lg bg-amber-400 px-3 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-300 transition shadow-sm"
          >
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  );
}
