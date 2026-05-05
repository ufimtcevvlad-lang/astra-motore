import { eq } from "drizzle-orm";
import { db, schema } from "../lib/db";
import { generateProductDescription } from "../lib/product-description-gen";
import { baseProductSlug } from "../lib/product-slug";
import type { Product } from "../lib/products-types";
import { SITE_BRAND, SITE_URL } from "../lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FALLBACK_CATEGORY_ID = 999999;
const FALLBACK_CATEGORY_TITLE = "Автозапчасти GM";

type FeedRow = {
  id: number;
  externalId: string;
  slug: string;
  sku: string;
  name: string;
  brand: string;
  country: string;
  categoryId: number | null;
  categoryTitle: string | null;
  car: string;
  price: number;
  inStock: number;
  image: string;
  images: string;
  description: string;
};

function escapeXml(value: string | number | boolean | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function parseImages(raw: string | null | undefined, cover: string): string[] {
  const urls: string[] = [];
  try {
    const parsed = JSON.parse(raw || "[]");
    if (Array.isArray(parsed)) {
      for (const url of parsed) {
        if (typeof url === "string" && url && url !== "/placeholder-product.svg") urls.push(url);
      }
    }
  } catch {}
  if (cover && cover !== "/placeholder-product.svg") urls.push(cover);
  return Array.from(new Set(urls));
}

function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function feedDate(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function rowToProduct(row: FeedRow): Product {
  const images = parseImages(row.images, row.image);
  return {
    id: row.externalId,
    sku: row.sku,
    name: row.name,
    brand: row.brand,
    country: row.country,
    category: row.categoryTitle ?? FALLBACK_CATEGORY_TITLE,
    car: row.car,
    price: row.price,
    inStock: row.inStock,
    image: images[0] ?? "",
    images,
    description: row.description,
  };
}

function productUrl(row: FeedRow): string {
  const slug = row.slug || baseProductSlug(rowToProduct(row));
  return `${SITE_URL}/product/${slug}`;
}

function renderCategory(id: number, title: string): string {
  return `      <category id="${id}">${escapeXml(title)}</category>`;
}

function renderOffer(row: FeedRow): string {
  const product = rowToProduct(row);
  const categoryId = row.categoryId ?? FALLBACK_CATEGORY_ID;
  const pictures = parseImages(row.images, row.image)
    .slice(0, 10)
    .map((url) => `        <picture>${escapeXml(absoluteUrl(url))}</picture>`)
    .join("\n");
  const description = product.description?.trim() || generateProductDescription(product);

  return [
    `      <offer id="${escapeXml(row.id)}" available="${row.inStock > 0 ? "true" : "false"}">`,
    `        <url>${escapeXml(productUrl(row))}</url>`,
    `        <price>${Math.max(0, Math.round(row.price))}</price>`,
    "        <currencyId>RUB</currencyId>",
    `        <categoryId>${categoryId}</categoryId>`,
    pictures,
    `        <name>${escapeXml(row.name)}</name>`,
    `        <vendor>${escapeXml(row.brand)}</vendor>`,
    `        <vendorCode>${escapeXml(row.sku)}</vendorCode>`,
    `        <description>${escapeXml(description)}</description>`,
    "        <store>true</store>",
    "        <pickup>true</pickup>",
    "        <delivery>true</delivery>",
    row.car ? `        <param name="Автомобиль">${escapeXml(row.car)}</param>` : "",
    `        <param name="Артикул">${escapeXml(row.sku)}</param>`,
    "      </offer>",
  ].filter(Boolean).join("\n");
}

export function GET() {
  const rows = db
    .select({
      id: schema.products.id,
      externalId: schema.products.externalId,
      slug: schema.products.slug,
      sku: schema.products.sku,
      name: schema.products.name,
      brand: schema.products.brand,
      country: schema.products.country,
      categoryId: schema.products.categoryId,
      categoryTitle: schema.categories.title,
      car: schema.products.car,
      price: schema.products.price,
      inStock: schema.products.inStock,
      image: schema.products.image,
      images: schema.products.images,
      description: schema.products.description,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(eq(schema.products.hidden, false))
    .all() as FeedRow[];

  const categoryMap = new Map<number, string>();
  for (const row of rows) {
    categoryMap.set(row.categoryId ?? FALLBACK_CATEGORY_ID, row.categoryTitle ?? FALLBACK_CATEGORY_TITLE);
  }

  const categories = Array.from(categoryMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([id, title]) => renderCategory(id, title))
    .join("\n");

  const offers = rows
    .filter((row) => row.price > 0 && row.sku && row.name && row.brand)
    .sort((a, b) => a.name.localeCompare(b.name, "ru"))
    .map(renderOffer)
    .join("\n");

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<yml_catalog date="${feedDate()}">`,
    "  <shop>",
    `    <name>${escapeXml(SITE_BRAND)}</name>`,
    `    <company>${escapeXml(SITE_BRAND)}</company>`,
    `    <url>${escapeXml(SITE_URL)}</url>`,
    "    <currencies>",
    '      <currency id="RUB" rate="1"/>',
    "    </currencies>",
    "    <categories>",
    categories,
    "    </categories>",
    "    <offers>",
    offers,
    "    </offers>",
    "  </shop>",
    "</yml_catalog>",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
