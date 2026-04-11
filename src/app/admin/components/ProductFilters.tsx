"use client";

import { useEffect, useRef, useState } from "react";

export interface ProductFiltersState {
  search: string;
  categoryId: string;
  brand: string;
  inStock: string;
  priceFrom: string;
  priceTo: string;
}

interface ProductFiltersProps {
  categories: { id: number; title: string }[];
  brands: string[];
  filters: ProductFiltersState;
  onChange: (filters: ProductFiltersState) => void;
}

export default function ProductFilters({
  categories,
  brands,
  filters,
  onChange,
}: ProductFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
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
    "px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white";
  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl shadow-sm mb-6">
      <input
        type="text"
        placeholder="Поиск по названию или артикулу..."
        value={searchInput}
        onChange={(e) => handleSearchChange(e.target.value)}
        className={`${inputClass} max-w-xs`}
      />

      <select
        value={filters.categoryId}
        onChange={(e) => handleChange("categoryId", e.target.value)}
        className={selectClass}
      >
        <option value="">Все категории</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>

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

      <select
        value={filters.inStock}
        onChange={(e) => handleChange("inStock", e.target.value)}
        className={selectClass}
      >
        <option value="">Все</option>
        <option value="yes">В наличии</option>
        <option value="no">Нет в наличии</option>
      </select>

      <div className="flex items-center gap-2">
        <input
          type="number"
          placeholder="От"
          value={filters.priceFrom}
          onChange={(e) => handleChange("priceFrom", e.target.value)}
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <span className="text-gray-400 text-sm">&mdash;</span>
        <input
          type="number"
          placeholder="До"
          value={filters.priceTo}
          onChange={(e) => handleChange("priceTo", e.target.value)}
          className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>
    </div>
  );
}
