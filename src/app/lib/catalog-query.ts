import type { Product } from "./products-types";
import { normalizeSkuForSearch } from "./sku-normalize";

export function normalizeCatalogQuery(q: string): string {
  return q.trim().toLowerCase();
}

export function productMatchesTextQuery(p: Product, queryNorm: string): boolean {
  if (!queryNorm) return true;
  const skuQuery = normalizeSkuForSearch(queryNorm);
  return (
    p.name.toLowerCase().includes(queryNorm) ||
    p.brand.toLowerCase().includes(queryNorm) ||
    p.car.toLowerCase().includes(queryNorm) ||
    p.sku.toLowerCase().includes(queryNorm) ||
    (skuQuery.length > 0 && normalizeSkuForSearch(p.sku).includes(skuQuery)) ||
    p.category.toLowerCase().includes(queryNorm)
  );
}
