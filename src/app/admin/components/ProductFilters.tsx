"use client";

import { useEffect, useRef, useState } from "react";

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
  onChange: (filters: ProductFiltersState) => void;
  onReset?: () => void;
  resultCount?: number | null;
}

export default function ProductFilters({
  categories,
  brands,
  filters,
  onChange,
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
            <span className={labelClass}>Поиск</span>
            <input
              type="text"
              placeholder="Название, артикул или часть номера"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className={inputClass}
            />
          </label>

          <div className="flex items-center justify-between gap-3 xl:justify-end">
            {resultCount !== undefined && (
              <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
                Найдено:{" "}
                <span className="font-semibold text-gray-900">
                  {resultCount === null ? "считаем" : resultCount}
                </span>
              </div>
            )}

            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                Сбросить
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Быстрые фильтры">
          <button
            type="button"
            onClick={() => onChange({ ...filters, recent: !filters.recent })}
            className={`${chipBase} ${filters.recent ? activeChip : mutedChip}`}
          >
            Недавно добавленные
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
              <option value="visible">Видимые</option>
              <option value="hidden">Скрытые</option>
            </select>
          </label>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid max-w-sm grid-cols-[1fr_auto_1fr] items-end gap-2">
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
                placeholder="999999"
                value={filters.priceTo}
                onChange={(e) => handleChange("priceTo", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          {filters.recent && (
            <div className="text-sm text-indigo-700">
              Сортировка: сначала товары, добавленные последними
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
