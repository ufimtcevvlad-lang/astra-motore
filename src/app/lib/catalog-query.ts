import type { Product } from "./products-types";

export function normalizeCatalogQuery(q: string): string {
  return q.trim().toLowerCase();
}

export function productMatchesTextQuery(p: Product, queryNorm: string): boolean {
  if (!queryNorm) return true;
  return (
    p.name.toLowerCase().includes(queryNorm) ||
    p.brand.toLowerCase().includes(queryNorm) ||
    p.car.toLowerCase().includes(queryNorm) ||
    p.sku.toLowerCase().includes(queryNorm) ||
    p.category.toLowerCase().includes(queryNorm)
  );
}
