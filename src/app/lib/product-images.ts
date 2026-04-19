import { readdirSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads", "products");
const PLACEHOLDER = "/placeholder-product.svg";
const IMG_EXT = /\.(jpe?g|png|webp|gif)$/i;

/**
 * Возвращает публичные URL всех фото товара из `public/uploads/products/<sku>/`.
 * Если папки нет или она пустая — возвращает [placeholder].
 */
export function getProductImages(sku: string): string[] {
  const dir = path.join(UPLOADS_ROOT, sku);
  if (!existsSync(dir)) return [PLACEHOLDER];
  try {
    const files = readdirSync(dir)
      .filter((f) => IMG_EXT.test(f))
      .sort();
    if (files.length === 0) return [PLACEHOLDER];
    return files.map((f) => `/uploads/products/${sku}/${f}`);
  } catch {
    return [PLACEHOLDER];
  }
}

/** Создаёт пустую директорию `public/uploads/products/<sku>/`, если её нет. */
export function ensureProductDir(sku: string): void {
  const dir = path.join(UPLOADS_ROOT, sku);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
