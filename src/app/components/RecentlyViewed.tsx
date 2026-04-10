"use client";

import { useEffect, useState } from "react";
import { getRecentlyViewedIds, trackProductView } from "../lib/recently-viewed";
import { products, type Product } from "../data/products";
import { CatalogProductCard } from "./catalog/CatalogProductCard";

const productsById = new Map(products.map((p) => [p.id, p]));

/**
 * Клиентский компонент: вызывается на карточке товара для записи просмотра.
 * Не рендерит ничего.
 */
export function TrackProductView({ productId }: { productId: string }) {
  useEffect(() => {
    trackProductView(productId);
  }, [productId]);
  return null;
}

/**
 * Блок «Вы недавно смотрели» — горизонтальная лента из 4-6 карточек.
 * Исключает текущий товар (если передан excludeId).
 */
export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    const ids = getRecentlyViewedIds();
    const resolved = ids
      .filter((id) => id !== excludeId)
      .map((id) => productsById.get(id))
      .filter((p): p is Product => p !== undefined)
      .slice(0, 6);
    setItems(resolved);
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">Вы недавно смотрели</h2>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {items.map((p) => (
          <div key={p.id} className="w-56 shrink-0 snap-start">
            <CatalogProductCard p={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
