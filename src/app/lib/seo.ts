import type { Metadata } from "next";
import { SITE_BRAND, SITE_URL } from "./site";

/** Open Graph / HTML lang */
export const SEO_LOCALE = "ru_RU";
export const SITE_LANGUAGE = "ru";

/** Основное описание сайта (meta description, manifest, агрегаторы). */
export const DEFAULT_META_DESCRIPTION = `Магазин ${SITE_BRAND}: автозапчасти GM — Opel и Chevrolet в Екатеринбурге. Оригинал и проверенные аналоги, доставка, каталог с артикулами и поиск по номеру детали.`;

/**
 * Ключевые фразы для `<meta name="keywords">` (умеренный набор без спама).
 * Поисковики опираются в основном на контент; поле — дополнительный сигнал.
 */
export const SEO_KEYWORDS = [
  "автозапчасти Екатеринбург",
  "запчасти Opel Екатеринбург",
  "запчасти Chevrolet Екатеринбург",
  "GM запчасти",
  "оригинальные запчасти GM",
  "аналоги запчастей Opel",
  "аналоги запчастей Chevrolet",
  "каталог автозапчастей",
  "доставка автозапчастей Екатеринбург",
  "автозапчасти GM Shop",
  "купить запчасти Opel",
  "купить запчасти Chevrolet",
  "артикул запчасти",
  "магазин автозапчастей Екатеринбург",
];

const OG_FALLBACK_PATH = "/brand/gm-shop-logo-header.png";

export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${p}`;
}

/** Дефолтное OG-изображение (Яндекс и др. используют Open Graph). */
export function defaultOgImages() {
  return [
    {
      url: absoluteUrl(OG_FALLBACK_PATH),
      width: 1024,
      height: 571,
      alt: `${SITE_BRAND} — автозапчасти GM`,
    },
  ];
}

/** Рекомендуемая длина сниппета Google ~150–160 символов. */
export function truncateMetaDescription(text: string, maxLen = 158): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLen) return normalized;
  const slice = normalized.slice(0, maxLen - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const base = lastSpace > 72 ? slice.slice(0, lastSpace) : slice;
  return `${base.trimEnd()}…`;
}

/** Дата для schema.org Offer.priceValidUntil (обновлять периодически). */
export const OFFER_PRICE_VALID_UNTIL = "2026-12-31";

export const defaultRobots = {
  index: true as const,
  follow: true as const,
  googleBot: {
    index: true as const,
    follow: true as const,
    "max-image-preview": "large" as const,
    "max-snippet": -1 as const,
    "max-video-preview": -1 as const,
  },
};

/** Единый блок Open Graph для посадочных (Яндекс; path с ведущим `/`). */
export function socialShareMetadata(opts: {
  title: string;
  description: string;
  path: `/${string}`;
}): Pick<Metadata, "openGraph"> {
  const images = defaultOgImages();
  return {
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: absoluteUrl(opts.path),
      siteName: SITE_BRAND,
      locale: SEO_LOCALE,
      type: "website",
      images,
    },
  };
}
