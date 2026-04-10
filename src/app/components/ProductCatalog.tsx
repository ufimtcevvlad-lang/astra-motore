"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CatalogProductCard } from "./catalog/CatalogProductCard";
import { products } from "../data/products";
import { CATALOG_SECTIONS } from "../data/catalog-sections";
import {
  applyFilters,
  computeBrandFacets,
  DEFAULT_FILTERS,
  filtersToSearchParams,
  getActiveChips,
  hasActiveFilters,
  removeChip,
  searchParamsToFilters,
  type CatalogFilterState,
  type SortMode,
} from "./catalog/CatalogFilters";

type ProductCatalogProps = {
  hideHubIntro?: boolean;
};

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "popular", label: "По популярности" },
  { value: "price-asc", label: "Сначала дешёвые" },
  { value: "price-desc", label: "Сначала дорогие" },
  { value: "name", label: "По названию" },
];

const sectionTitleBySlug = new Map(
  CATALOG_SECTIONS.map((s) => [s.slug, s.title] as const),
);

function ProductCatalogInner(_props: ProductCatalogProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Инициализируем state из URL
  const [filters, setFilters] = useState<CatalogFilterState>(() =>
    searchParamsToFilters(searchParams),
  );

  // Sync с URL при навигации (кнопка назад, ссылка)
  useEffect(() => {
    setFilters(searchParamsToFilters(searchParams));
  }, [searchParams]);

  // Обновить URL при изменении фильтров
  const updateUrl = useCallback(
    (newFilters: CatalogFilterState) => {
      const params = filtersToSearchParams(newFilters);
      const qs = params.toString();
      router.replace(qs ? `/catalog?${qs}` : "/catalog", { scroll: false });
    },
    [router],
  );

  const setFilter = useCallback(
    <K extends keyof CatalogFilterState>(key: K, value: CatalogFilterState[K]) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        updateUrl(next);
        return next;
      });
    },
    [updateUrl],
  );

  const clearAll = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    router.replace("/catalog", { scroll: false });
  }, [router]);

  const handleRemoveChip = useCallback(
    (chipKey: string) => {
      setFilters((prev) => {
        const next = removeChip(prev, chipKey);
        updateUrl(next);
        return next;
      });
    },
    [updateUrl],
  );

  const toggleBrand = useCallback(
    (brand: string) => {
      setFilters((prev) => {
        const newBrands = new Set(prev.brands);
        if (newBrands.has(brand)) newBrands.delete(brand);
        else newBrands.add(brand);
        const next = { ...prev, brands: newBrands };
        updateUrl(next);
        return next;
      });
    },
    [updateUrl],
  );

  // ========== Вычисления ==========

  const filtered = useMemo(
    () => applyFilters(products, filters, sectionTitleBySlug),
    [filters],
  );

  const brandFacets = useMemo(
    () => computeBrandFacets(products, filters, sectionTitleBySlug),
    [filters],
  );

  // Все бренды отсортированные по количеству
  const sortedBrands = useMemo(() => {
    return [...brandFacets.entries()]
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [brandFacets]);

  const chips = useMemo(
    () => getActiveChips(filters, sectionTitleBySlug),
    [filters],
  );

  const isFiltered = hasActiveFilters(filters);

  // Цена мин/макс для плейсхолдеров
  const priceRange = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 0 };
    const prices = products.map((p) => p.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, []);

  // Мобильный sidebar
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Debounce для цены
  const priceFromRef = useRef<HTMLInputElement>(null);
  const priceToRef = useRef<HTMLInputElement>(null);

  const applyPriceFilter = useCallback(() => {
    const from = priceFromRef.current?.value ? Number(priceFromRef.current.value) : null;
    const to = priceToRef.current?.value ? Number(priceToRef.current.value) : null;
    setFilters((prev) => {
      const next = { ...prev, priceFrom: from, priceTo: to };
      updateUrl(next);
      return next;
    });
  }, [updateUrl]);

  // ========== Sidebar фильтров ==========

  const FilterPanel = (
    <div className="space-y-5">
      {/* Марка авто */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Марка</p>
        <div className="mt-2 inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5" role="group">
          {(["all", "opel", "chevrolet"] as const).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={filters.carBrand === id}
              onClick={() => setFilter("carBrand", id)}
              className={`flex-1 rounded-md px-2 py-2 text-xs font-medium transition ${
                filters.carBrand === id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {id === "all" ? "Все" : id === "opel" ? "Opel" : "Chevrolet"}
            </button>
          ))}
        </div>
      </div>

      {/* Раздел */}
      <div>
        <label htmlFor="sidebar-section" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Раздел
        </label>
        <select
          id="sidebar-section"
          value={filters.section}
          onChange={(e) => setFilter("section", e.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25"
        >
          <option value="all">Все разделы</option>
          {CATALOG_SECTIONS.map((s) => (
            <option key={s.slug} value={s.slug}>{s.title}</option>
          ))}
        </select>
      </div>

      {/* Бренд производителя */}
      {sortedBrands.length > 0 && (
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
                  checked={filters.brands.has(brand)}
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
            defaultValue={filters.priceFrom ?? ""}
            onBlur={applyPriceFilter}
            onKeyDown={(e) => e.key === "Enter" && applyPriceFilter()}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <span className="text-slate-400">–</span>
          <input
            ref={priceToRef}
            type="number"
            placeholder={`до ${priceRange.max}`}
            defaultValue={filters.priceTo ?? ""}
            onBlur={applyPriceFilter}
            onKeyDown={(e) => e.key === "Enter" && applyPriceFilter()}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Только в наличии */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={filters.inStockOnly}
          onChange={(e) => setFilter("inStockOnly", e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 accent-amber-500"
        />
        Только в наличии
      </label>

      {/* Сбросить */}
      {isFiltered && (
        <button
          type="button"
          onClick={clearAll}
          className="w-full rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Сбросить все фильтры
        </button>
      )}
    </div>
  );

  return (
    <section className="space-y-6">
      {/* Шапка: поиск + сортировка */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            value={filters.query}
            onChange={(e) => setFilter("query", e.target.value)}
            placeholder="Название, артикул или модель авто…"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-400/30"
          />
          <select
            value={filters.sort}
            onChange={(e) => setFilter("sort", e.target.value as SortMode)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-amber-400 sm:w-52"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Мобильная кнопка фильтров */}
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 lg:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Фильтры{chips.length > 0 ? ` (${chips.length})` : ""}
        </button>
      </div>

      {/* Чипы активных фильтров */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => handleRemoveChip(chip.key)}
              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900 transition hover:bg-amber-200"
            >
              {chip.label}
              <span aria-hidden className="ml-0.5 text-amber-600">✕</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
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
                onClick={clearAll}
                className="mt-4 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <CatalogProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Мобильный bottom-sheet */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileFiltersOpen(false)}
          />
          {/* Panel */}
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
