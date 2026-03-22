import { products, type Product } from "../data/products";
import { sortProductsById } from "../data/catalog-sections";

/** Лёгкий объект для API и подсказок (без длинного description) */
export type SearchResultItem = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  car: string;
  price: number;
  image: string;
};

export function normalizeCatalogQuery(q: string): string {
  return q.trim().toLowerCase();
}

/** Та же логика «текст попал в поле», что и в каталоге (без фильтра марки/раздела). */
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

function relevanceScore(p: Product, q: string): number {
  const sku = p.sku.toLowerCase();
  const name = p.name.toLowerCase();
  let s = 0;
  if (sku === q) s += 1000;
  else if (sku.startsWith(q)) s += 500;
  else if (sku.includes(q)) s += 400;
  if (name.includes(q)) s += 120;
  if (p.brand.toLowerCase().includes(q)) s += 40;
  if (p.car.toLowerCase().includes(q)) s += 30;
  if (p.category.toLowerCase().includes(q)) s += 20;
  return s;
}

function toSearchResultItem(p: Product): SearchResultItem {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    category: p.category,
    car: p.car,
    price: p.price,
    image: p.image,
  };
}

/**
 * Подсказки для поиска: отсортированы по релевантности (артикул — выше).
 */
export function searchCatalogProducts(query: string, limit: number): SearchResultItem[] {
  const q = normalizeCatalogQuery(query);
  if (!q || q.length < 1) return [];

  const candidates = products.filter((p) => productMatchesTextQuery(p, q));
  return candidates
    .map((p) => ({ p, score: relevanceScore(p, q) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return sortProductsById(a.p, b.p);
    })
    .slice(0, Math.max(1, Math.min(limit, 24)))
    .map(({ p }) => toSearchResultItem(p));
}
