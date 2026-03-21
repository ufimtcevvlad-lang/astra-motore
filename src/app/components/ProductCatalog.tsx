"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CatalogProductCard } from "./catalog/CatalogProductCard";
import { products, type Product } from "../data/products";
import {
  CATALOG_GROUPS,
  CATALOG_SECTIONS,
  sectionsInGroup,
  sortProductsById,
} from "../data/catalog-sections";

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
          ? "border-amber-600 bg-amber-600 text-white shadow-sm"
          : "border-amber-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50"
      }`}
    >
      {children}
    </button>
  );
}

type BrandFilter = "all" | "opel" | "chevrolet";

function productMatchesBrand(p: Product, brand: BrandFilter): boolean {
  if (brand === "all") return true;
  const t = p.car.toLowerCase();
  if (brand === "opel") return t.includes("opel");
  return t.includes("chevrolet");
}

type ProductCatalogProps = {
  /** Скрыть дублирующий блок ссылок на марки (полоска «Каталоги» уже в шапке) */
  hideHubIntro?: boolean;
};

export function ProductCatalog({ hideHubIntro = false }: ProductCatalogProps) {
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | "all">("all");
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");

  const queryNorm = query.trim().toLowerCase();
  const groupedMode = activeSlug === "all" && !queryNorm;

  const filtered = useMemo(() => {
    return products
      .filter((p) => {
        if (!productMatchesBrand(p, brandFilter)) return false;
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
  }, [queryNorm, activeSlug, brandFilter]);

  const clearFilters = () => {
    setQuery("");
    setActiveSlug("all");
    setBrandFilter("all");
  };

  return (
    <section className="space-y-6">
      {!hideHubIntro ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-4 py-3 text-sm">
          <p className="font-medium text-slate-800">Каталоги по марке</p>
          <p className="mt-1 text-xs text-slate-600">
            Отдельные страницы с текстом и примерами — дублируют путь в шапке «Каталоги».
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href="/zapchasti-opel"
              className="inline-flex rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:border-amber-400 hover:bg-amber-50"
            >
              Каталог Opel
            </Link>
            <Link
              href="/zapchasti-chevrolet"
              className="inline-flex rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:border-amber-400 hover:bg-amber-50"
            >
              Каталог Chevrolet
            </Link>
            <Link
              href="/zapchasti-gm"
              className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300"
            >
              Все запчасти GM
            </Link>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-600">Фильтр по марке в каталоге</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={brandFilter === "all"} onClick={() => setBrandFilter("all")}>
            Все марки
          </Chip>
          <Chip active={brandFilter === "opel"} onClick={() => setBrandFilter("opel")}>
            Opel
          </Chip>
          <Chip active={brandFilter === "chevrolet"} onClick={() => setBrandFilter("chevrolet")}>
            Chevrolet
          </Chip>
        </div>
      </div>

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
          className="w-full rounded-lg border border-amber-200 px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
        />
      </div>

      {/* Витрина: мелкие рубрики по типу детали */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-600">Витрина — по типу детали</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={activeSlug === "all"} onClick={() => setActiveSlug("all")}>
            Все разделы
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
          В режиме «Все разделы» товары сгруппированы по блокам (ТО, двигатель, охлаждение…). Один раздел — только его позиции. Поиск и марка работают вместе.
        </p>
      </div>

      {groupedMode ? (
        <nav
          aria-label="Быстрый переход по группам каталога"
          className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs"
        >
          <span className="font-medium text-slate-600 self-center">К группам:</span>
          {CATALOG_GROUPS.map((g) => (
            <a
              key={g.slug}
              href={`#catalog-group-${g.slug}`}
              className="rounded-full bg-white border border-slate-200 px-2.5 py-1 text-slate-700 hover:border-amber-300 hover:text-amber-800"
            >
              {g.title}
            </a>
          ))}
        </nav>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-slate-600">
          По вашему запросу ничего не найдено.{" "}
          <button
            type="button"
            onClick={clearFilters}
            className="text-amber-600 hover:underline font-medium"
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
            {groupedMode ? " по группам и разделам" : ""}
          </p>

          {groupedMode ? (
            <div className="space-y-12">
              {CATALOG_GROUPS.map((group) => {
                const sections = sectionsInGroup(group.slug);
                const hasAny = sections.some((sec) =>
                  products.some(
                    (p) =>
                      p.category === sec.title &&
                      productMatchesBrand(p, brandFilter)
                  )
                );
                if (!hasAny) return null;

                return (
                  <div
                    key={group.slug}
                    id={`catalog-group-${group.slug}`}
                    className="scroll-mt-28 space-y-8"
                  >
                    <div className="border-b border-amber-200/80 pb-3">
                      <h2 className="text-xl font-semibold text-slate-900">{group.title}</h2>
                      <p className="text-xs text-slate-500 mt-1">{group.hint}</p>
                    </div>

                    {sections.map((section) => {
                      const items = products
                        .filter(
                          (p) =>
                            p.category === section.title &&
                            productMatchesBrand(p, brandFilter)
                        )
                        .sort(sortProductsById);
                      if (items.length === 0) return null;
                      return (
                        <div
                          key={section.slug}
                          id={`catalog-${section.slug}`}
                          className="scroll-mt-28 space-y-4"
                        >
                          <div className="border-b border-slate-200/90 pb-2">
                            <h3 className="text-lg font-semibold text-slate-800">{section.title}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{section.hint}</p>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {items.map((p) => (
                              <CatalogProductCard key={p.id} p={p} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <CatalogProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
