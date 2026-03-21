"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ProductImage } from "./ProductImage";
import { products, type Product } from "../data/products";
import { CATALOG_SECTIONS, sortProductsById } from "../data/catalog-sections";

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

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "border-rose-600 bg-rose-600 text-white shadow-sm"
          : "border-rose-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50"
      }`}
    >
      {children}
    </button>
  );
}

export function ProductCatalog() {
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | "all">("all");

  const queryNorm = query.trim().toLowerCase();
  const groupedMode = activeSlug === "all" && !queryNorm;

  const filtered = useMemo(() => {
    return products
      .filter((p) => {
        if (activeSlug !== "all") {
          const sec = CATALOG_SECTIONS.find((s) => s.slug === activeSlug);
          if (sec && p.category !== sec.title) return false;
        }
        if (!queryNorm) return true;
        return (
          p.name.toLowerCase().includes(queryNorm) ||
          p.brand.toLowerCase().includes(queryNorm) ||
          p.car.toLowerCase().includes(queryNorm) ||
          p.sku.toLowerCase().includes(queryNorm) ||
          p.category.toLowerCase().includes(queryNorm) ||
          p.country.toLowerCase().includes(queryNorm)
        );
      })
      .sort(sortProductsById);
  }, [queryNorm, activeSlug]);

  const clearFilters = () => {
    setQuery("");
    setActiveSlug("all");
  };

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <label htmlFor="search" className="text-sm font-medium text-slate-700">
          Поиск по названию, бренду, авто, артикулу или разделу
        </label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Например: фильтр, Cruze, Hengst, артикул…"
          className="w-full rounded-lg border border-rose-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-600">Разделы каталога</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={activeSlug === "all"} onClick={() => setActiveSlug("all")}>
            Все товары
          </Chip>
          {CATALOG_SECTIONS.map((s) => (
            <Chip
              key={s.slug}
              active={activeSlug === s.slug}
              onClick={() => setActiveSlug(s.slug)}
            >
              {s.title}
            </Chip>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          «Все товары» — по разделам ниже. Один раздел — только его позиции. Поиск работает вместе с выбранным разделом.
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600">
          По вашему запросу ничего не найдено.{" "}
          <button
            type="button"
            onClick={clearFilters}
            className="text-rose-600 hover:underline font-medium"
          >
            Сбросить фильтры
          </button>
          .
        </p>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            Показано: {filtered.length}{" "}
            {filtered.length === 1 ? "товар" : filtered.length < 5 ? "товара" : "товаров"}
            {groupedMode ? " по разделам" : ""}
          </p>

          {groupedMode ? (
            <div className="space-y-10">
              {CATALOG_SECTIONS.map((section) => {
                const items = products
                  .filter((p) => p.category === section.title)
                  .sort(sortProductsById);
                if (items.length === 0) return null;
                return (
                  <div
                    key={section.slug}
                    id={`catalog-${section.slug}`}
                    className="scroll-mt-28 space-y-4"
                  >
                    <div className="border-b border-rose-200/80 pb-3">
                      <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                      <p className="text-xs text-slate-500 mt-1">{section.hint}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {items.map((p) => (
                        <ProductCard key={p.id} p={p} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
