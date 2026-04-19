"use client";

import { type Product } from "../../lib/products-types";

// ==================== ТИПЫ ====================

export type SortMode = "popular" | "price-asc" | "price-desc" | "name";

export type CatalogFilterState = {
  query: string;
  section: string; // slug or "all"
  carBrand: "all" | "opel" | "chevrolet";
  brands: Set<string>; // выбранные бренды производителя
  priceFrom: number | null;
  priceTo: number | null;
  inStockOnly: boolean;
  sort: SortMode;
};

export const DEFAULT_FILTERS: CatalogFilterState = {
  query: "",
  section: "all",
  carBrand: "all",
  brands: new Set(),
  priceFrom: null,
  priceTo: null,
  inStockOnly: false,
  sort: "popular",
};

// ==================== ФИЛЬТРАЦИЯ ====================

export function matchesCarBrand(p: Product, carBrand: CatalogFilterState["carBrand"]): boolean {
  if (carBrand === "all") return true;
  const t = p.car.toLowerCase();
  return carBrand === "opel" ? t.includes("opel") : t.includes("chevrolet");
}

export function matchesTextQuery(p: Product, q: string): boolean {
  if (!q) return true;
  return (
    p.name.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    p.car.toLowerCase().includes(q) ||
    p.sku.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q)
  );
}

export function applyFilters(
  allProducts: Product[],
  filters: CatalogFilterState,
  sectionTitleBySlug: Map<string, string>,
): Product[] {
  const q = filters.query.trim().toLowerCase();
  const sectionTitle = filters.section === "all" ? null : (sectionTitleBySlug.get(filters.section) ?? null);

  const result = allProducts.filter((p) => {
    if (!matchesCarBrand(p, filters.carBrand)) return false;
    if (sectionTitle && p.category !== sectionTitle) return false;
    if (q && !matchesTextQuery(p, q)) return false;
    if (filters.brands.size > 0 && !filters.brands.has(p.brand)) return false;
    if (filters.priceFrom !== null && p.price < filters.priceFrom) return false;
    if (filters.priceTo !== null && p.price > filters.priceTo) return false;
    if (filters.inStockOnly && p.inStock <= 0) return false;
    return true;
  });

  // Сортировка
  switch (filters.sort) {
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
      result.sort((a, b) => b.inStock - a.inStock);
      break;
  }

  return result;
}

// ==================== ФАСЕТЫ (количество по каждому бренду) ====================

/**
 * Считает количество товаров для каждого бренда производителя,
 * с учётом ВСЕХ активных фильтров КРОМЕ бренда.
 * Так пользователь видит реальные числа при добавлении бренда.
 */
export function computeBrandFacets(
  allProducts: Product[],
  filters: CatalogFilterState,
  sectionTitleBySlug: Map<string, string>,
): Map<string, number> {
  const filtersWithoutBrand = { ...filters, brands: new Set<string>() };
  const base = applyFilters(allProducts, filtersWithoutBrand, sectionTitleBySlug);

  const counts = new Map<string, number>();
  for (const p of base) {
    counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
  }
  return counts;
}

// ==================== URL SYNC ====================

export function filtersToSearchParams(f: CatalogFilterState): URLSearchParams {
  const params = new URLSearchParams();
  if (f.query) params.set("q", f.query);
  if (f.section !== "all") params.set("section", f.section);
  if (f.carBrand !== "all") params.set("car", f.carBrand);
  if (f.brands.size > 0) params.set("brand", [...f.brands].sort().join(","));
  if (f.priceFrom !== null) params.set("priceFrom", String(f.priceFrom));
  if (f.priceTo !== null) params.set("priceTo", String(f.priceTo));
  if (f.inStockOnly) params.set("inStock", "1");
  if (f.sort !== "popular") params.set("sort", f.sort);
  return params;
}

export function searchParamsToFilters(sp: URLSearchParams): CatalogFilterState {
  const brandStr = sp.get("brand") ?? "";
  const brands = new Set(brandStr ? brandStr.split(",").filter(Boolean) : []);
  const priceFrom = sp.has("priceFrom") ? Number(sp.get("priceFrom")) : null;
  const priceTo = sp.has("priceTo") ? Number(sp.get("priceTo")) : null;

  return {
    query: sp.get("q") ?? "",
    section: sp.get("section") ?? "all",
    carBrand: (sp.get("car") as CatalogFilterState["carBrand"]) ?? "all",
    brands,
    priceFrom: priceFrom !== null && !isNaN(priceFrom) ? priceFrom : null,
    priceTo: priceTo !== null && !isNaN(priceTo) ? priceTo : null,
    inStockOnly: sp.get("inStock") === "1",
    sort: (sp.get("sort") as SortMode) ?? "popular",
  };
}

// ==================== ХЕЛПЕРЫ ====================

export function hasActiveFilters(f: CatalogFilterState): boolean {
  return (
    f.query.trim().length > 0 ||
    f.section !== "all" ||
    f.carBrand !== "all" ||
    f.brands.size > 0 ||
    f.priceFrom !== null ||
    f.priceTo !== null ||
    f.inStockOnly ||
    f.sort !== "popular"
  );
}

/** Описания активных фильтров для чипов. */
export function getActiveChips(
  f: CatalogFilterState,
  sectionTitleBySlug: Map<string, string>,
): Array<{ key: string; label: string }> {
  const chips: Array<{ key: string; label: string }> = [];

  if (f.query.trim()) chips.push({ key: "query", label: `«${f.query.trim()}»` });
  if (f.section !== "all") {
    const title = sectionTitleBySlug.get(f.section) ?? f.section;
    chips.push({ key: "section", label: title });
  }
  if (f.carBrand !== "all") {
    chips.push({ key: "carBrand", label: f.carBrand === "opel" ? "Opel" : "Chevrolet" });
  }
  for (const brand of f.brands) {
    chips.push({ key: `brand:${brand}`, label: brand });
  }
  if (f.priceFrom !== null || f.priceTo !== null) {
    const from = f.priceFrom ? `от ${f.priceFrom.toLocaleString("ru-RU")}` : "";
    const to = f.priceTo ? `до ${f.priceTo.toLocaleString("ru-RU")}` : "";
    chips.push({ key: "price", label: `${from}${from && to ? " " : ""}${to} ₽` });
  }
  if (f.inStockOnly) chips.push({ key: "inStock", label: "В наличии" });

  return chips;
}

export function removeChip(
  f: CatalogFilterState,
  chipKey: string,
): CatalogFilterState {
  if (chipKey === "query") return { ...f, query: "" };
  if (chipKey === "section") return { ...f, section: "all" };
  if (chipKey === "carBrand") return { ...f, carBrand: "all" };
  if (chipKey === "price") return { ...f, priceFrom: null, priceTo: null };
  if (chipKey === "inStock") return { ...f, inStockOnly: false };
  if (chipKey.startsWith("brand:")) {
    const brand = chipKey.slice(6);
    const newBrands = new Set(f.brands);
    newBrands.delete(brand);
    return { ...f, brands: newBrands };
  }
  return f;
}
