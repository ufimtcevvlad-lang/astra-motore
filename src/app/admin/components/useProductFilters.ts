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
};

function readParams(sp: URLSearchParams): { filters: ProductFiltersState; page: number } {
  return {
    filters: {
      search: sp.get("search") ?? "",
      categoryId: sp.get("categoryId") ?? "",
      brand: sp.get("brand") ?? "",
      inStock: sp.get("inStock") ?? "",
      priceFrom: sp.get("priceFrom") ?? "",
      priceTo: sp.get("priceTo") ?? "",
    },
    page: Math.max(1, Number(sp.get("page") ?? "1") || 1),
  };
}

function buildQuery(filters: ProductFiltersState, page: number): string {
  const p = new URLSearchParams();
  if (filters.search) p.set("search", filters.search);
  if (filters.categoryId) p.set("categoryId", filters.categoryId);
  if (filters.brand) p.set("brand", filters.brand);
  if (filters.inStock) p.set("inStock", filters.inStock);
  if (filters.priceFrom) p.set("priceFrom", filters.priceFrom);
  if (filters.priceTo) p.set("priceTo", filters.priceTo);
  if (page > 1) p.set("page", String(page));
  return p.toString();
}

function isEmpty(f: ProductFiltersState): boolean {
  return (
    !f.search && !f.categoryId && !f.brand && !f.inStock && !f.priceFrom && !f.priceTo
  );
}

export function useProductFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const { filters, page } = useMemo(() => readParams(new URLSearchParams(sp.toString())), [sp]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sp.toString() !== "") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ProductFiltersState;
      if (isEmpty(saved)) return;
      const q = buildQuery(saved, 1);
      if (q) router.replace(`${pathname}?${q}`, { scroll: false });
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const push = (next: ProductFiltersState, nextPage: number) => {
    const q = buildQuery(next, nextPage);
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
    setFilters: (f: ProductFiltersState) => push(f, 1),
    setPage: (p: number) => push(filters, p),
    reset: () => push(EMPTY, 1),
  };
}
