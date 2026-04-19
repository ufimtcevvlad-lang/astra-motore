"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CatalogProductCard } from "./catalog/CatalogProductCard";
import { CatalogGroupNav } from "./catalog/CatalogGroupNav";
import { RecentlyViewed } from "./RecentlyViewed";
import { productMatchesTextQuery } from "../lib/catalog-query";
import type { Product } from "../lib/products-types";
import {
  CATALOG_GROUPS,
  CATALOG_SECTIONS,
  sectionsInGroup,
  sortProductsById,
} from "../data/catalog-sections";

type SortMode = "popular" | "price-asc" | "price-desc" | "name";
type ViewMode = "grid" | "list";
type CatalogSectionSlug = (typeof CATALOG_SECTIONS)[number]["slug"];

const VIEW_MODE_KEY = "catalog-view-mode";

function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setModeState] = useState<ViewMode>("grid");

  useEffect(() => {
    const stored = localStorage.getItem(VIEW_MODE_KEY);
    if (stored === "list" || stored === "grid") setModeState(stored);
  }, []);

  const setMode = useCallback((next: ViewMode) => {
    setModeState(next);
    localStorage.setItem(VIEW_MODE_KEY, next);
  }, []);

  return [mode, setMode];
}

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "popular", label: "По популярности" },
  { value: "price-asc", label: "Сначала дешёвые" },
  { value: "price-desc", label: "Сначала дорогие" },
  { value: "name", label: "По названию" },
];

const sectionTitleBySlug: Map<string, string> = new Map(
  CATALOG_SECTIONS.map((s) => [s.slug, s.title]),
);

type ProductCatalogProps = {
  hideHubIntro?: boolean;
  products: Product[];
};

function ProductCatalogInner({ hideHubIntro = false, products }: ProductCatalogProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [activeSlug, setActiveSlug] = useState<CatalogSectionSlug | "all">("all");
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [priceFrom, setPriceFrom] = useState<number | null>(null);
  const [priceTo, setPriceTo] = useState<number | null>(null);
  const [sort, setSort] = useState<SortMode>("popular");
  const [viewMode, setViewMode] = useViewMode();

  // Синхронизация поля поиска с ?q= при переходе из шапки или по ссылке
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- синхронизация с URL (внешняя система)
    setQuery(searchParams.get("q") ?? "");
    const sectionParam = searchParams.get("section");
    if (sectionParam && sectionTitleBySlug.has(sectionParam)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveSlug(sectionParam as CatalogSectionSlug);
    }
  }, [searchParams]);

  const queryNorm = query.trim().toLowerCase();
  const groupedMode = activeSlug === "all" && !queryNorm && selectedBrands.size === 0 && priceFrom === null && priceTo === null;

  const sectionBySlug = useMemo(
    () => new Map(CATALOG_SECTIONS.map((section) => [section.slug, section] as const)),
    [],
  );

  // Фильтрация
  const filtered = useMemo(() => {
    const activeSectionTitle =
      activeSlug === "all" ? null : (sectionBySlug.get(activeSlug)?.title ?? null);

    const result = products.filter((p) => {
      if (activeSectionTitle && p.category !== activeSectionTitle) return false;
      if (queryNorm && !productMatchesTextQuery(p, queryNorm)) return false;
      if (selectedBrands.size > 0 && !selectedBrands.has(p.brand)) return false;
      if (priceFrom !== null && p.price < priceFrom) return false;
      if (priceTo !== null && p.price > priceTo) return false;
      return true;
    });

    switch (sort) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name, "ru"));
        break;
      case "popular":
      default:
        result.sort(sortProductsById);
        break;
    }

    return result;
  }, [queryNorm, activeSlug, selectedBrands, priceFrom, priceTo, sort, sectionBySlug]);

  // Группировка по разделам для grouped mode
  const itemsBySectionTitle = useMemo(() => {
    const bySection = new Map<string, Product[]>();
    for (const p of filtered) {
      const list = bySection.get(p.category);
      if (list) list.push(p);
      else bySection.set(p.category, [p]);
    }
    return bySection;
  }, [filtered]);

  // Фасеты: кол-во товаров по каждому бренду (без учёта текущего выбора бренда)
  const brandFacets = useMemo(() => {
    const activeSectionTitle =
      activeSlug === "all" ? null : (sectionBySlug.get(activeSlug)?.title ?? null);

    const base = products.filter((p) => {
      if (activeSectionTitle && p.category !== activeSectionTitle) return false;
      if (queryNorm && !productMatchesTextQuery(p, queryNorm)) return false;
      if (priceFrom !== null && p.price < priceFrom) return false;
      if (priceTo !== null && p.price > priceTo) return false;
      return true;
    });

    const counts = new Map<string, number>();
    for (const p of base) {
      counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
    }
    return counts;
  }, [queryNorm, activeSlug, priceFrom, priceTo, sectionBySlug]);

  const sortedBrands = useMemo(
    () =>
      [...brandFacets.entries()]
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]),
    [brandFacets],
  );

  // Кол-во товаров по разделам (для dropdown)
  const sectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return counts;
  }, []);

  // Цена мин/макс для плейсхолдеров
  const priceRange = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 0 };
    const prices = products.map((p) => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, []);

  const hasActiveFilters =
    queryNorm.length > 0 ||
    activeSlug !== "all" ||
    selectedBrands.size > 0 ||
    priceFrom !== null ||
    priceTo !== null ||
    sort !== "popular";

  const clearFilters = () => {
    setQuery("");
    setActiveSlug("all");
    setSelectedBrands(new Set());
    setPriceFrom(null);
    setPriceTo(null);
    setSort("popular");
    router.replace("/catalog");
  };

  const toggleBrand = useCallback((brand: string) => {
    setSelectedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  }, []);

  // Мобильный sidebar
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Debounce для цены
  const priceFromRef = useRef<HTMLInputElement>(null);
  const priceToRef = useRef<HTMLInputElement>(null);

  const applyPriceFilter = useCallback(() => {
    const from = priceFromRef.current?.value ? Number(priceFromRef.current.value) : null;
    const to = priceToRef.current?.value ? Number(priceToRef.current.value) : null;
    setPriceFrom(from !== null && !isNaN(from) ? from : null);
    setPriceTo(to !== null && !isNaN(to) ? to : null);
  }, []);

  // ========== Sidebar фильтров ==========
  const FilterPanel = (
    <div className="space-y-5">
      {/* Раздел */}
      <div>
        <label htmlFor="sidebar-section" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Раздел
        </label>
        <select
          id="sidebar-section"
          value={activeSlug}
          onChange={(e) =>
            setActiveSlug(e.target.value === "all" ? "all" : (e.target.value as CatalogSectionSlug))
          }
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25"
        >
          <option value="all">Все разделы ({products.length})</option>
          {CATALOG_SECTIONS.map((s) => {
            const count = sectionCounts.get(s.title) ?? 0;
            return (
              <option key={s.slug} value={s.slug}>
                {s.title} ({count})
              </option>
            );
          })}
        </select>
      </div>

      {/* Бренд производителя */}
      {sortedBrands.length > 1 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Бренд</p>
          <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
            {sortedBrands.map(([brand, count]) => (
              <label
                key={brand}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.has(brand)}
                  onChange={() => toggleBrand(brand)}
                  className="h-4 w-4 rounded border-slate-300 accent-amber-500"
                />
                <span className="flex-1 text-slate-800">{brand === "—" ? "Без бренда" : brand}</span>
                <span className="text-xs text-slate-400">{count}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Цена */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Цена, ₽</p>
        <div className="mt-2 flex items-center gap-2">
          <input
            ref={priceFromRef}
            type="number"
            placeholder={`от ${priceRange.min}`}
            defaultValue={priceFrom ?? ""}
            onBlur={applyPriceFilter}
            onKeyDown={(e) => e.key === "Enter" && applyPriceFilter()}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <span className="text-slate-400">–</span>
          <input
            ref={priceToRef}
            type="number"
            placeholder={`до ${priceRange.max}`}
            defaultValue={priceTo ?? ""}
            onBlur={applyPriceFilter}
            onKeyDown={(e) => e.key === "Enter" && applyPriceFilter()}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Сбросить */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => {
            clearFilters();
            setMobileFiltersOpen(false);
          }}
          className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Сбросить все фильтры
        </button>
      )}
    </div>
  );

  return (
    <section className="space-y-6">
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
          </div>
        </div>
      ) : null}

      {/* Шапка: поиск + сортировка */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Название, артикул или модель авто…"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/30"
          />
          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-amber-400 sm:w-52"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Переключатель сетка/список */}
            <div className="hidden sm:flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                aria-label="Сетка"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={`rounded-md p-2 transition ${viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Список"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={`rounded-md p-2 transition ${viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <CatalogGroupNav
          products={filtered}
          visible={groupedMode}
          variant="inline"
        />

        {/* Мобильная кнопка фильтров */}
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 lg:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Фильтры
          {(selectedBrands.size > 0 || activeSlug !== "all" || priceFrom !== null || priceTo !== null)
            ? ` (${(selectedBrands.size > 0 ? 1 : 0) + (activeSlug !== "all" ? 1 : 0) + (priceFrom !== null || priceTo !== null ? 1 : 0)})`
            : ""}
        </button>
      </div>

      {/* Активные фильтры (чипы) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {activeSlug !== "all" && (
            <button
              type="button"
              onClick={() => setActiveSlug("all")}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900 transition hover:bg-amber-200"
            >
              {sectionTitleBySlug.get(activeSlug) ?? activeSlug}
              <span aria-hidden className="ml-0.5 text-amber-600">✕</span>
            </button>
          )}
          {[...selectedBrands].map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => toggleBrand(brand)}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900 transition hover:bg-amber-200"
            >
              {brand === "—" ? "Без бренда" : brand}
              <span aria-hidden className="ml-0.5 text-amber-600">✕</span>
            </button>
          ))}
          {(priceFrom !== null || priceTo !== null) && (
            <button
              type="button"
              onClick={() => {
                setPriceFrom(null);
                setPriceTo(null);
                if (priceFromRef.current) priceFromRef.current.value = "";
                if (priceToRef.current) priceToRef.current.value = "";
              }}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900 transition hover:bg-amber-200"
            >
              {priceFrom ? `от ${priceFrom.toLocaleString("ru-RU")}` : ""}
              {priceFrom && priceTo ? " " : ""}
              {priceTo ? `до ${priceTo.toLocaleString("ru-RU")}` : ""} ₽
              <span aria-hidden className="ml-0.5 text-amber-600">✕</span>
            </button>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          >
            Сбросить всё
          </button>
        </div>
      )}

      {/* Счётчик результатов */}
      <p className="text-sm text-slate-500">
        Найдено: <span className="font-semibold text-slate-800">{filtered.length}</span> из {products.length}
      </p>

      {/* Основной layout: сайдбар + товары */}
      <div className="lg:flex lg:items-start lg:gap-6">
        {/* Сайдбар — только десктоп */}
        <aside className="hidden w-64 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:block">
          {FilterPanel}
        </aside>

        {/* Товары */}
        <div className="min-w-0 flex-1">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center">
              <p className="text-lg font-semibold text-slate-700">Ничего не найдено</p>
              <p className="mt-2 text-sm text-slate-500">
                Попробуйте изменить фильтры или{" "}
                <Link href="/vin-request" className="font-medium text-amber-700 underline">
                  отправьте VIN запрос
                </Link>
                {" "}— поможем найти нужную деталь.
              </p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : groupedMode ? (
            <div className="space-y-10">
              {CATALOG_GROUPS.map((group) => {
                const sections = sectionsInGroup(group.slug);
                const hasAny = sections.some(
                  (sec) => (itemsBySectionTitle.get(sec.title)?.length ?? 0) > 0,
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
                      const items = itemsBySectionTitle.get(section.title) ?? [];
                      if (items.length === 0) return null;
                      return (
                        <div
                          key={section.slug}
                          id={`catalog-${section.slug}`}
                          className="scroll-mt-28 space-y-4"
                        >
                          <h3 className="text-lg font-semibold text-slate-800">{section.title}</h3>
                          <div className={viewMode === "list" ? "flex flex-col gap-3" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"}>
                            {items.map((p) => (
                              <CatalogProductCard key={p.id} p={p} variant={viewMode} />
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
            <div className={viewMode === "list" ? "flex flex-col gap-3" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"}>
              {filtered.map((p) => (
                <CatalogProductCard key={p.id} p={p} variant={viewMode} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Мобильный bottom-sheet */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Фильтры</h3>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                aria-label="Закрыть фильтры"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {FilterPanel}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-5 w-full rounded-lg bg-amber-500 py-3 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              Показать {filtered.length} товаров
            </button>
          </div>
        </div>
      )}

      <RecentlyViewed />
    </section>
  );
}

export function ProductCatalog(props: ProductCatalogProps) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          <div className="lg:flex lg:gap-6">
            <div className="hidden h-96 w-64 animate-pulse rounded-2xl bg-slate-100 lg:block" />
            <div className="flex-1">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ProductCatalogInner {...props} />
    </Suspense>
  );
}
