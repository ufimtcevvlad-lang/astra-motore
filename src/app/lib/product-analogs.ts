import type { Product } from "../data/products";

/** Аналоги только из того же каталога; показываем только с ценой строго ниже текущей. */
export function getCheaperAnalogs(product: Product, all: Product[]): Product[] {
  const ids = product.analogIds ?? [];
  const out: Product[] = [];
  for (const id of ids) {
    const p = all.find((x) => x.id === id);
    if (p && p.price < product.price) out.push(p);
  }
  return out.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, "ru"));
}
