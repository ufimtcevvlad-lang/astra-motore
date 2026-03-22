"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CatalogProductCard } from "./catalog/CatalogProductCard";
import { CatalogGroupNav } from "./catalog/CatalogGroupNav";
import { productMatchesTextQuery } from "../lib/catalog-search";
import { products, type Product } from "../data/products";
import {
  CATALOG_GROUPS,
  CATALOG_SECTIONS,
  sectionsInGroup,
  sortProductsById,
} from "../data/catalog-sections";

type BrandFilter = "all" | "opel" | "chevrolet";

function productMatchesBrand(p: Product, brand: BrandFilter): boolean {
  if (brand === "all") return true;
  const t = p.car.toLowerCase();
  if (brand === "opel") return t.includes("opel");
  return t.includes("chevrolet");
}

type ProductCatalogProps = {
  hideHubIntro?: boolean;
};

function ProductCatalogInner({ hideHubIntro = false }: ProductCatalogProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState<string | "all">("all");
  const [brandFilter, setBrandFilter] = useState<BrandFilter>("all");

  // Синхронизация поля поиска с ?q= при переходе из шапки или по ссылке
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- синхронизация с URL (внешняя система)
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

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
        return productMatchesTextQuery(p, queryNorm);
      })
      .sort(sortProductsById);
  }, [queryNorm, activeSlug, brandFilter]);

  const hasActiveFilters =
    queryNorm.length > 0 || activeSlug !== "all" || brandFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setActiveSlug("all");
    setBrandFilter("all");
    router.replace("/catalog");
  };

  return (
    <section className="space-y-8">
      {!hideHubIntro ? (
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-sm">
          <p className="font-medium text-slate-800">Каталоги по марке</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href="/zapchasti-opel"
              className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:border-amber-400"
            >
              Opel
            </Link>
            <Link
              href="/zapchasti-chevrolet"
              className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:border-amber-400"
            >
              Chevrolet
            </Link>
            <Link
              href="/zapchasti-gm"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-slate-300"
            >
              Все GM
            </Link>
          </div>
        </div>
      ) : null}

      {/* Блок фильтров: марка → поиск → «к группам» (на моб.) → раздел (как на схеме сверху вниз) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Марка</span>
          <div
            className="inline-flex w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 p-1"
            role="group"
            aria-label="Фильтр по марке"
          >
            {(
              [
                { id: "all" as const, label: "Все" },
                { id: "opel" as const, label: "Opel" },
                { id: "chevrolet" as const, label: "Chevrolet" },
              ] as const
            ).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={brandFilter === id}
                onClick={() => setBrandFilter(id)}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition sm:px-4 ${
                  brandFilter === id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="sr-only" htmlFor="catalog-search">
          Поиск по каталогу
        </label>
        <input
          id="catalog-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Название, артикул или модель авто…"
          className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/30"
        />

        <CatalogGroupNav
          products={products}
          brandFilter={brandFilter}
          visible={groupedMode}
          variant="inline"
        />

        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:gap-3">
          <label htmlFor="catalog-section" className="text-xs font-medium uppercase tracking-wide text-slate-500 shrink-0">
            Раздел
          </label>
          <select
            id="catalog-section"
            value={activeSlug}
            onChange={(e) => setActiveSlug(e.target.value as typeof activeSlug)}
            className="w-full min-w-0 cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25 sm:max-w-md"
          >
            <option value="all">Все разделы сразу</option>
            {CATALOG_SECTIONS.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.title}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters ? (
          <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-amber-800 underline-offset-2 hover:underline"
            >
              Сбросить фильтры
            </button>
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-slate-600">
          Ничего не нашли. Попробуйте другой запрос или{" "}
          <button type="button" onClick={clearFilters} className="font-medium text-amber-800 underline">
            сбросьте фильтры
          </button>
          .
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            Показано: <span className="font-semibold text-slate-800">{filtered.length}</span>
          </p>

          {groupedMode ? (
            <div className="lg:flex lg:items-start lg:gap-8">
              <CatalogGroupNav
                products={products}
                brandFilter={brandFilter}
                visible={groupedMode}
                variant="sidebar"
              />
              <div className="min-w-0 flex-1 space-y-10">
                {CATALOG_GROUPS.map((group) => {
                  const sections = sectionsInGroup(group.slug);
                  const hasAny = sections.some((sec) =>
                    products.some((p) => p.category === sec.title && productMatchesBrand(p, brandFilter))
                  );
                  if (!hasAny) return null;

                  return (
                    <div
                      key={group.slug}
                      id={`catalog-group-${group.slug}`}
                      className="scroll-mt-28 space-y-8"
                    >
                      <h2 className="border-b border-amber-200/80 pb-2 text-xl font-semibold text-slate-900">
                        {group.title}
                      </h2>

                      {sections.map((section) => {
                        const items = products
                          .filter(
                            (p) => p.category === section.title && productMatchesBrand(p, brandFilter)
                          )
                          .sort(sortProductsById);
                        if (items.length === 0) return null;
                        return (
                          <div
                            key={section.slug}
                            id={`catalog-${section.slug}`}
                            className="scroll-mt-28 space-y-4"
                          >
                            <h3 className="text-lg font-semibold text-slate-800">{section.title}</h3>
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

export function ProductCatalog(props: ProductCatalogProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      }
    >
      <ProductCatalogInner {...props} />
    </Suspense>
  );
}
