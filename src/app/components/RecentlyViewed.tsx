"use client";

import { useEffect, useState } from "react";
import { getRecentlyViewedIds, trackProductView } from "../lib/recently-viewed";
import type { Product } from "../lib/products-types";
import { CatalogProductCard } from "./catalog/CatalogProductCard";

export function TrackProductView({ productId }: { productId: string }) {
  useEffect(() => {
    trackProductView(productId);
  }, [productId]);
  return null;
}

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    const ids = getRecentlyViewedIds()
      .filter((id) => id !== excludeId)
      .slice(0, 6);
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    const url = `/api/public/products/by-ids?ids=${encodeURIComponent(ids.join(","))}`;
    let cancelled = false;
    fetch(url)
      .then((r) => r.json())
      .then((data: { items: Product[] }) => {
        if (cancelled) return;
        const byId = new Map(data.items.map((p) => [p.id, p]));
        const ordered = ids.map((id) => byId.get(id)).filter((p): p is Product => !!p);
        setItems(ordered);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
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
