"use client";

import Link from "next/link";
import type { Product } from "../lib/products-types";
import { CatalogProductCard } from "./catalog/CatalogProductCard";

export function HomeFeatured({ items }: { items: Product[] }) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
            Популярные позиции
          </h2>
          <p className="text-sm text-slate-600 mt-2">Оформление как в каталоге</p>
        </div>
        <Link
          href="/catalog"
          className="text-sm font-medium text-amber-700 hover:text-amber-800 hover:underline shrink-0"
        >
          Смотреть весь каталог →
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <CatalogProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
