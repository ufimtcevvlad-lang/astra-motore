"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ProductImage } from "./ProductImage";
import { products, type Product } from "../data/products";

function ProductCard({ p }: { p: Product }) {
  return (
    <article className="rounded-xl bg-white shadow-md border border-rose-100 flex flex-col overflow-hidden hover:shadow-lg hover:border-rose-200 transition">
      <div className="aspect-[4/3] relative bg-slate-100 rounded-t-lg overflow-hidden">
        <ProductImage
          src={p.image}
          alt={p.name}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <h2 className="font-semibold text-sm line-clamp-2">{p.name}</h2>
        <p className="text-xs text-rose-700/90 font-medium">{p.category}</p>
        <p className="text-xs text-slate-500">
          {p.brand} • {p.car}
        </p>
        <p className="text-sm font-bold text-rose-600">
          {p.price.toLocaleString("ru-RU")} ₽
        </p>
        <p className="text-xs text-slate-500">
          Артикул: {p.sku} • В наличии: {p.inStock}
        </p>
        <div className="mt-auto pt-2">
          <Link
            href={`/product/${p.id}`}
            className="inline-flex w-full justify-center rounded-lg bg-rose-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-rose-700 transition shadow-sm"
          >
            Подробнее
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProductCatalog() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.car.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.country.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="search" className="text-sm font-medium text-slate-700">
          Поиск по названию, бренду, авто или артикулу
        </label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Например: тормозные, Toyota, TRW..."
          className="w-full sm:w-64 rounded-lg border border-rose-200 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600">
          По вашему запросу ничего не найдено. Измените поиск или{" "}
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-rose-600 hover:underline font-medium"
          >
            очистите поле
          </button>
          .
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Найдено: {filtered.length} {filtered.length === 1 ? "товар" : filtered.length < 5 ? "товара" : "товаров"}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <ProductCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}
