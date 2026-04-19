import type { Product } from "./products-types";

/** Транслитерация кириллицы → латиница (ГОСТ 7.79-2000 Б, упрощённая). */
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function transliterate(s: string): string {
  return s.toLowerCase().split("").map((c) => TRANSLIT[c] ?? c).join("");
}

export function slugifySegment(s: string): string {
  return transliterate(s)
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractPartType(name: string): string {
  const clean = name.split("|")[0].trim();
  const cutoff = clean.search(/\b[A-Z]{2,}[a-z]*\b|\b[A-Z]\d{2}[A-Z]/);
  const raw = cutoff > 0 ? clean.slice(0, cutoff).trim() : clean;
  const words = raw.split(/\s+/).slice(0, 5);
  return words.join(" ").replace(/[,()]/g, "").trim();
}

/** База slug из имени + бренда + SKU (без учёта коллизий). */
export function baseProductSlug(product: Pick<Product, "name" | "brand" | "sku">): string {
  const partType = slugifySegment(extractPartType(product.name));
  const b = slugifySegment(product.brand) || "brand";
  const k = slugifySegment(product.sku) || "sku";
  return partType ? `${partType}-${b}-${k}` : `${b}-${k}`;
}

/** Возвращает slug товара из его сохранённого поля. */
export function getProductSlug(product: Product & { slug?: string }): string {
  return product.slug && product.slug.length > 0 ? product.slug : baseProductSlug(product);
}

export function productPath(product: Product & { slug?: string }): string {
  return `/product/${getProductSlug(product)}`;
}
