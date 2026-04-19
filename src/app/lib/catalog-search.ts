import type { Product } from "./products-types";
import { getAllProducts } from "./products-db";
import { sortProductsById } from "../data/catalog-sections";
import { getProductSlug } from "./product-slug";

/** Лёгкий объект для API и подсказок (без длинного description) */
export type SearchResultItem = {
  id: string;
  slug: string;
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

type IndexedProduct = {
  product: Product & { slug?: string };
  skuNorm: string;
  nameNorm: string;
  brandNorm: string;
  carNorm: string;
  categoryNorm: string;
};

let cachedIndex: IndexedProduct[] | null = null;
function getIndexedProducts(): IndexedProduct[] {
  if (!cachedIndex) {
    cachedIndex = getAllProducts().map((product) => ({
      product,
      skuNorm: product.sku.toLowerCase(),
      nameNorm: product.name.toLowerCase(),
      brandNorm: product.brand.toLowerCase(),
      carNorm: product.car.toLowerCase(),
      categoryNorm: product.category.toLowerCase(),
    }));
  }
  return cachedIndex;
}

export function invalidateSearchIndex(): void {
  cachedIndex = null;
}

function indexedProductMatchesTextQuery(p: IndexedProduct, queryNorm: string): boolean {
  if (!queryNorm) return true;
  return (
    p.nameNorm.includes(queryNorm) ||
    p.brandNorm.includes(queryNorm) ||
    p.carNorm.includes(queryNorm) ||
    p.skuNorm.includes(queryNorm) ||
    p.categoryNorm.includes(queryNorm)
  );
}

function relevanceScore(p: IndexedProduct, q: string): number {
  let s = 0;
  if (p.skuNorm === q) s += 1000;
  else if (p.skuNorm.startsWith(q)) s += 500;
  else if (p.skuNorm.includes(q)) s += 400;
  if (p.nameNorm.includes(q)) s += 120;
  if (p.brandNorm.includes(q)) s += 40;
  if (p.carNorm.includes(q)) s += 30;
  if (p.categoryNorm.includes(q)) s += 20;
  return s;
}

function toSearchResultItem(p: Product & { slug?: string }): SearchResultItem {
  return {
    id: p.id,
    slug: getProductSlug(p),
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    category: p.category,
    car: p.car,
    price: p.price,
    image: p.image,
  };
}

export function searchCatalogProducts(query: string, limit: number): SearchResultItem[] {
  const q = normalizeCatalogQuery(query);
  if (!q || q.length < 1) return [];

  const candidates = getIndexedProducts().filter((p) => indexedProductMatchesTextQuery(p, q));
  return candidates
    .map((p) => ({ p, score: relevanceScore(p, q) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return sortProductsById(a.p.product, b.p.product);
    })
    .slice(0, Math.max(1, Math.min(limit, 24)))
    .map(({ p }) => toSearchResultItem(p.product));
}
