"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProductFiltersState } from "./ProductFilters";

const STORAGE_KEY = "admin.products.filters.last";
const EMPTY: ProductFiltersState = {
  search: "",
  categoryId: "",
  brand: "",
  inStock: "",
  priceFrom: "",
  priceTo: "",
  nocat: false,
};

export type SortField = "updated" | "name" | "price" | "inStock" | "brand";
export type SortDir = "asc" | "desc";
export interface SortState {
  field: SortField;
  dir: SortDir;
}
const DEFAULT_SORT: SortState = { field: "updated", dir: "desc" };

function readParams(sp: URLSearchParams): {
  filters: ProductFiltersState;
  page: number;
  sort: SortState;
} {
  return {
    filters: {
      search: sp.get("search") ?? "",
      categoryId: sp.get("categoryId") ?? "",
      brand: sp.get("brand") ?? "",
      inStock: sp.get("inStock") ?? "",
      priceFrom: sp.get("priceFrom") ?? "",
      priceTo: sp.get("priceTo") ?? "",
      nocat: sp.get("nocat") === "1",
    },
    page: Math.max(1, Number(sp.get("page") ?? "1") || 1),
    sort: {
      field: (sp.get("sort") as SortField) || "updated",
      dir: sp.get("dir") === "asc" ? "asc" : "desc",
    },
  };
}

function buildQuery(filters: ProductFiltersState, page: number, sort: SortState): string {
  const p = new URLSearchParams();
  if (filters.search) p.set("search", filters.search);
  if (filters.categoryId) p.set("categoryId", filters.categoryId);
  if (filters.brand) p.set("brand", filters.brand);
  if (filters.inStock) p.set("inStock", filters.inStock);
  if (filters.priceFrom) p.set("priceFrom", filters.priceFrom);
  if (filters.priceTo) p.set("priceTo", filters.priceTo);
  if (filters.nocat) p.set("nocat", "1");
  if (page > 1) p.set("page", String(page));
  if (sort.field !== DEFAULT_SORT.field) p.set("sort", sort.field);
  if (sort.dir !== DEFAULT_SORT.dir) p.set("dir", sort.dir);
  return p.toString();
}

function isEmpty(f: ProductFiltersState): boolean {
  return (
    !f.search && !f.categoryId && !f.brand && !f.inStock && !f.priceFrom && !f.priceTo && !f.nocat
  );
}

export function useProductFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const { filters, page, sort } = useMemo(
    () => readParams(new URLSearchParams(sp.toString())),
    [sp]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sp.toString() !== "") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ProductFiltersState;
      if (isEmpty(saved)) return;
      const q = buildQuery(saved, 1, DEFAULT_SORT);
      if (q) router.replace(`${pathname}?${q}`, { scroll: false });
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const push = (next: ProductFiltersState, nextPage: number, nextSort: SortState) => {
    const q = buildQuery(next, nextPage, nextSort);
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    try {
      if (isEmpty(next)) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return {
    filters,
    page,
    sort,
    setFilters: (f: ProductFiltersState) => push(f, 1, sort),
    setPage: (p: number) => push(filters, p, sort),
    setSort: (s: SortState) => push(filters, 1, s),
    reset: () => push(EMPTY, 1, DEFAULT_SORT),
  };
}
