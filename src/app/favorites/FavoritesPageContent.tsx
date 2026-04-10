"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useFavorites } from "../components/FavoritesContext";
import { CatalogProductCard } from "../components/catalog/CatalogProductCard";
import { products } from "../data/products";

const productsById = new Map(products.map((p) => [p.id, p]));

export function FavoritesPageContent() {
  const { favorites } = useFavorites();

  const items = useMemo(
    () =>
      [...favorites]
        .map((id) => productsById.get(id))
        .filter((p) => p !== undefined),
    [favorites],
  );

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
