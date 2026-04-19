"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFavorites } from "../components/FavoritesContext";
import { CatalogProductCard } from "../components/catalog/CatalogProductCard";
import type { Product } from "../lib/products-types";

export function FavoritesPageContent() {
  const { favorites } = useFavorites();
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    const ids = [...favorites];
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/public/products/by-ids?ids=${encodeURIComponent(ids.join(","))}`)
      .then((r) => r.json())
      .then((data: { items: Product[] }) => {
        if (cancelled) return;
        const byId = new Map(data.items.map((p) => [p.id, p]));
        setItems(ids.map((id) => byId.get(id)).filter((p): p is Product => !!p));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [favorites]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center">
        <p className="text-lg font-semibold text-slate-700">Пока пусто</p>
        <p className="mt-2 text-sm text-slate-500">
          Нажмите сердечко на карточке товара, чтобы сохранить его здесь.
        </p>
        <Link
          href="/catalog"
          className="mt-4 inline-flex rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-300"
        >
          Перейти в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <CatalogProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}
