"use client";

import { useEffect, useRef, useState } from "react";
import type { SortState } from "./useProductFilters";

export interface ProductFiltersState {
  search: string;
  categoryId: string;
  brand: string;
  inStock: string;
  hidden: string;
  priceFrom: string;
  priceTo: string;
  nocat: boolean;
  recent: boolean;
}

interface ProductFiltersProps {
  categories: { id: number; title: string }[];
  brands: string[];
  filters: ProductFiltersState;
  sort: SortState;
  onChange: (filters: ProductFiltersState) => void;
  onSortChange: (sort: SortState) => void;
  onReset?: () => void;
  resultCount?: number | null;
}

interface ActiveFilter {
  key: string;
  label: string;
  onRemove: () => void;
}

export default function ProductFilters({
  categories,
  brands,
  filters,
  sort,
  onChange,
  onSortChange,
  onReset,
  resultCount,
}: ProductFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- синхронизируем поле с внешними фильтрами
    setSearchInput(filters.search);
  }, [filters.search]);

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange({ ...filters, search: value });
    }, 300);
  }

  function handleChange(key: keyof ProductFiltersState, value: string) {
    onChange({ ...filters, [key]: value });
  }

  function handleSortValue(value: string) {
    const [field, dir] = value.split(":") as [SortState["field"], SortState["dir"]];
    onSortChange({ field, dir });
  }

  const activeFilters: ActiveFilter[] = [];
  const selectedCategory = categories.find((c) => String(c.id) === filters.categoryId);

  if (filters.search) {
    activeFilters.push({
      key: "search",
      label: `Поиск: ${filters.search}`,
      onRemove: () => onChange({ ...filters, search: "" }),
    });
  }
  if (filters.recent) {
    activeFilters.push({
      key: "recent",
      label: "Новые",
      onRemove: () => onChange({ ...filters, recent: false }),
    });
  }
  if (filters.hidden) {
    activeFilters.push({
      key: "hidden",
      label: filters.hidden === "hidden" ? "Скрытые" : "Опубликованные",
      onRemove: () => onChange({ ...filters, hidden: "" }),
    });
  }
  if (filters.nocat) {
    activeFilters.push({
      key: "nocat",
      label: "Без категории",
      onRemove: () => onChange({ ...filters, nocat: false }),
    });
  }
  if (filters.categoryId) {
    activeFilters.push({
      key: "category",
      label: `Категория: ${selectedCategory?.title ?? filters.categoryId}`,
      onRemove: () => onChange({ ...filters, categoryId: "" }),
    });
  }
  if (filters.brand) {
    activeFilters.push({
      key: "brand",
      label: `Бренд: ${filters.brand}`,
      onRemove: () => onChange({ ...filters, brand: "" }),
    });
  }
  if (filters.inStock) {
    activeFilters.push({
      key: "stock",
      label: filters.inStock === "no" ? "Нет в наличии" : "В наличии",
      onRemove: () => onChange({ ...filters, inStock: "" }),
    });
  }
  if (filters.priceFrom || filters.priceTo) {
    activeFilters.push({
      key: "price",
      label: `Цена: ${filters.priceFrom || "0"}-${filters.priceTo || "∞"}`,
      onRemove: () => onChange({ ...filters, priceFrom: "", priceTo: "" }),
    });
  }

  const sortValue = `${sort.field}:${sort.dir}`;

  const selectClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white";
  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";
  const labelClass = "text-xs font-medium text-gray-500";
  const chipBase =
    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors";
  const mutedChip = "border-gray-300 text-gray-600 hover:bg-gray-50";
  const activeChip = "border-indigo-300 bg-indigo-50 text-indigo-700";

  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className={labelClass}>Поиск товаров</span>
            <div className="relative">
              <input
                type="text"
                placeholder="Название, артикул или OEM"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`${inputClass} pr-10`}
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => handleSearchChange("")}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Очистить поиск"
                >
                  ×
                </button>
              )}
            </div>
          </label>

          <div className="grid gap-3 sm:grid-cols-[minmax(190px,240px)_auto] xl:items-end">
            <label className="flex min-w-0 flex-col gap-1">
              <span className={labelClass}>Сортировка</span>
              <select
                value={sortValue}
                onChange={(e) => handleSortValue(e.target.value)}
                className={selectClass}
              >
                <option value="updated:desc">Недавно обновленные</option>
                <option value="created:desc">Новые сначала</option>
                <option value="created:asc">Старые сначала</option>
                <option value="name:asc">Название А-Я</option>
                <option value="name:desc">Название Я-А</option>
                <option value="price:asc">Цена по возрастанию</option>
                <option value="price:desc">Цена по убыванию</option>
                <option value="inStock:asc">Остаток по возрастанию</option>
                <option value="inStock:desc">Остаток по убыванию</option>
              </select>
            </label>

            <div className="flex items-center justify-between gap-3 self-end xl:justify-end">
            {resultCount !== undefined && (
              <div className="whitespace-nowrap px-1 py-2 text-sm text-gray-500">
                <span className="font-semibold text-gray-900">
                  {resultCount === null ? "Считаем" : resultCount.toLocaleString("ru-RU")}
                </span>{" "}
                {resultCount === null ? "..." : "товаров"}
              </div>
            )}

            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                Сбросить фильтры
              </button>
            )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={labelClass}>Быстрые фильтры</span>
          <div className="flex flex-wrap gap-2" aria-label="Быстрые фильтры">
          <button
            type="button"
            onClick={() => onChange({ ...filters, recent: !filters.recent })}
            className={`${chipBase} ${filters.recent ? activeChip : mutedChip}`}
          >
            Новые
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, hidden: filters.hidden === "hidden" ? "" : "hidden" })}
            className={`${chipBase} ${
              filters.hidden === "hidden"
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : mutedChip
            }`}
          >
            Скрытые
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, nocat: !filters.nocat, categoryId: "" })}
            className={`${chipBase} ${
              filters.nocat
                ? "border-amber-400 bg-amber-100 text-amber-800"
                : mutedChip
            }`}
          >
            Без категории
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...filters, inStock: filters.inStock === "no" ? "" : "no" })}
            className={`${chipBase} ${
              filters.inStock === "no"
                ? "border-orange-300 bg-orange-50 text-orange-700"
                : mutedChip
            }`}
          >
            Нет в наличии
          </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex min-w-0 flex-col gap-1">
            <span className={labelClass}>Категория</span>
            <select
              value={filters.categoryId}
              onChange={(e) =>
                onChange({ ...filters, categoryId: e.target.value, nocat: false })
              }
              className={selectClass}
            >
              <option value="">Все категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1">
            <span className={labelClass}>Бренд</span>
            <select
              value={filters.brand}
              onChange={(e) => handleChange("brand", e.target.value)}
              className={selectClass}
            >
              <option value="">Все бренды</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1">
            <span className={labelClass}>Остаток</span>
            <select
              value={filters.inStock}
              onChange={(e) => handleChange("inStock", e.target.value)}
              className={selectClass}
            >
              <option value="">Любой остаток</option>
              <option value="yes">В наличии</option>
              <option value="no">Нет в наличии</option>
            </select>
          </label>

          <label className="flex min-w-0 flex-col gap-1">
            <span className={labelClass}>Видимость</span>
            <select
              value={filters.hidden}
              onChange={(e) => handleChange("hidden", e.target.value)}
              className={selectClass}
            >
              <option value="">Все товары</option>
              <option value="visible">Опубликованные</option>
              <option value="hidden">Скрытые</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid max-w-md grid-cols-[1fr_auto_1fr] items-end gap-2">
            <label className="flex min-w-0 flex-col gap-1">
              <span className={labelClass}>Цена от</span>
              <input
                type="number"
                placeholder="0"
                value={filters.priceFrom}
                onChange={(e) => handleChange("priceFrom", e.target.value)}
                className={inputClass}
              />
            </label>
            <span className="pb-2 text-sm text-gray-400">—</span>
            <label className="flex min-w-0 flex-col gap-1">
              <span className={labelClass}>Цена до</span>
              <input
                type="number"
                placeholder="Без ограничения"
                value={filters.priceTo}
                onChange={(e) => handleChange("priceTo", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
              <span className={labelClass}>Активно:</span>
              {activeFilters.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={filter.onRemove}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  {filter.label} ×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
