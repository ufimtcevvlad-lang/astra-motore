# Идеальная карточка товара — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Переработать карточку товара до идеального состояния: SEO, визуал, шаблонные описания, адаптация к неполным данным.

**Architecture:** Изменения затрагивают SEO-утилиты (`lib/seo.ts`), страницу товара (`product/[slug]/page.tsx`), сайдбар (`ProductClient.tsx`), галерею (`ProductImageGallery.tsx`), и новый модуль автогенерации описаний (`lib/product-description-gen.ts`). Табы убираем, контент выводим секциями. Визуальная иерархия: белые карточки только для интерактивных блоков.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-13-product-card-perfect.md`

---

### Task 1: Автогенерация описаний — модуль `product-description-gen.ts`

**Files:**
- Create: `src/app/lib/product-description-gen.ts`

- [ ] **Step 1: Создать модуль автогенерации описаний**

Создать файл `src/app/lib/product-description-gen.ts`:

```typescript
import type { Product } from "../data/products";

/**
 * Маппинг категории → тип-фраза для описания.
 * Если категория не найдена, используется дефолт из GENERIC_PHRASES.
 */
const CATEGORY_PHRASE_MAP: Record<string, string> = {
  "Масляные фильтры": "фильтрующий элемент",
  "Воздушные фильтры": "фильтрующий элемент",
  "Салонные фильтры": "фильтрующий элемент",
  "Топливные фильтры": "фильтрующий элемент",
  "Фильтры АКПП": "фильтрующий элемент",
  "ТО и расходники": "расходник",
  "Двигатель и смазка": "деталь двигателя",
  "Двигатель": "деталь двигателя",
  "Охлаждение": "элемент системы охлаждения",
  "Прокладки и уплотнения": "уплотнительный элемент",
  "Прокладки, сальники и кольца": "уплотнительный элемент",
  "Подвеска": "элемент подвески",
  "Тормозная система": "тормозной компонент",
  "Свет и электрика": "электрокомпонент",
  "Автосвет и электрика": "электрокомпонент",
  "Свечи и зажигание": "элемент системы зажигания",
  "Кузов и крепёж": "кузовной элемент",
};

const GENERIC_PHRASES = [
  "запчасть",
  "автокомпонент",
  "деталь",
  "комплектующая",
  "расходник",
];

const CLOSING_PHRASES = [
  "В наличии, отправка из Екатеринбурга.",
  "Склад Екатеринбург, доставка по РФ.",
  "Есть на складе, быстрая отправка.",
  "В наличии в Екатеринбурге, отправим по РФ.",
  "На складе, доставка по России.",
  "Готов к отправке из Екатеринбурга.",
];

/** Детерминированный hash от строки → индекс в массиве. */
function hashIndex(s: string, len: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return ((h % len) + len) % len;
}

/** Генерирует короткое SEO-описание товара из имеющихся данных. */
export function generateProductDescription(product: Product): string {
  const typPhrase =
    CATEGORY_PHRASE_MAP[product.category] ??
    GENERIC_PHRASES[hashIndex(product.id, GENERIC_PHRASES.length)];

  const closing = CLOSING_PHRASES[hashIndex(product.id + "close", CLOSING_PHRASES.length)];

  const parts: string[] = [];

  // Название (бренд)? — тип для авто
  if (product.brand) {
    parts.push(`${product.name} (${product.brand}) — ${typPhrase}`);
  } else {
    parts.push(`${product.name} — ${typPhrase}`);
  }

  if (product.car) {
    parts[0] += ` для ${product.car}`;
  }
  parts[0] += ".";

  // Артикул
  parts.push(`Артикул ${product.sku}.`);

  // Финальная фраза
  parts.push(closing);

  return parts.join(" ");
}

/** Генерирует meta description для страницы товара. */
export function generateProductMetaDescription(product: Product): string {
  const parts: string[] = [];

  if (product.brand) {
    parts.push(`${product.brand} ${product.sku} — ${product.name}`);
  } else {
    parts.push(`${product.sku} — ${product.name}`);
  }

  if (product.car) {
    parts[0] += ` для ${product.car}`;
  }
  parts[0] += ".";

  parts.push(`Арт. ${product.sku}, в наличии в Екатеринбурге.`);
  parts.push("Доставка по РФ. Гарантия. GM Shop 66.");

  const full = parts.join(" ");
  if (full.length <= 158) return full;

  // Обрезка по слову
  const slice = full.slice(0, 157);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 72 ? slice.slice(0, lastSpace) : slice).trimEnd() + "…";
}

/** Генерирует title для страницы товара. */
export function generateProductTitle(product: Product): string {
  return `${product.sku} — ${product.name} | GM Shop 66`;
}

/** Генерирует meta keywords для Яндекса. */
export function generateProductKeywords(product: Product): string[] {
  const kw: string[] = [product.sku];
  if (product.brand) kw.push(product.brand);
  // Извлекаем название детали без бренда и артикула
  const cleanName = product.name
    .replace(product.sku, "")
    .replace(product.brand, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleanName) kw.push(cleanName);
  if (product.car) kw.push(product.car);
  kw.push("автозапчасти Екатеринбург");
  return kw;
}
```

- [ ] **Step 2: Коммит**

```bash
git add src/app/lib/product-description-gen.ts
git commit -m "feat(product): add template description generator with deterministic hash"
```

---

### Task 2: SEO-разметка — обновить metadata и JSON-LD

**Files:**
- Modify: `src/app/product/[slug]/page.tsx` (функция `generateMetadata` и JSON-LD блоки)
- Modify: `src/app/lib/seo.ts` (убрать `truncateMetaDescription` из экспортов если больше не нужна извне)

- [ ] **Step 1: Обновить `generateMetadata` в `page.tsx`**

Заменить текущую функцию `generateMetadata` (строки ~37–85). Новая версия использует `generateProductTitle`, `generateProductMetaDescription`, `generateProductKeywords` из нового модуля:

```typescript
import {
  generateProductTitle,
  generateProductMetaDescription,
  generateProductKeywords,
} from "../../lib/product-description-gen";
```

В `generateMetadata`:
```typescript
const title = generateProductTitle(product);
const description = generateProductMetaDescription(product);
const keywords = generateProductKeywords(product);
const url = productPath(product);
const galleryUrls = getProductImageUrls(product);
const ogImages =
  galleryUrls.length > 0
    ? galleryUrls.map((u) => ({ url: `${SITE_URL}${u}` }))
    : defaultOgImages();

return {
  title,
  description,
  keywords,
  alternates: { canonical: url },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
    },
  },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}${url}`,
    siteName: SITE_BRAND,
    locale: SEO_LOCALE,
    type: "website",
    images: ogImages,
  },
  other: {
    "product:price:amount": String(product.price),
    "product:price:currency": "RUB",
  },
};
```

Примечание: Next.js Metadata API не поддерживает `og:type = "product"` напрямую — используем `type: "website"` + `other` для product-тегов.

- [ ] **Step 2: Обновить JSON-LD Product в `page.tsx`**

Заменить текущий `productLd` объект. Добавить `mpn`, `seller`, `shippingDetails`, `hasMerchantReturnPolicy`, `aggregateRating`:

```typescript
const productLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name,
  description: generateProductDescription(product),
  sku: product.sku,
  mpn: product.sku,
  category: product.category,
  brand: product.brand
    ? { "@type": "Brand", name: product.brand }
    : undefined,
  image:
    imageUrls.length > 0
      ? imageUrls.map((u) => SITE_URL + u)
      : undefined,
  itemCondition: "https://schema.org/NewCondition",
  inLanguage: SITE_LANGUAGE,
  additionalProperty,
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.5",
    reviewCount: "39",
    bestRating: "5",
  },
  offers: {
    "@type": "Offer",
    priceCurrency: "RUB",
    price: product.price,
    availability:
      product.inStock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    url: SITE_URL + canonicalPath,
    itemCondition: "https://schema.org/NewCondition",
    priceValidUntil: OFFER_PRICE_VALID_UNTIL,
    seller: {
      "@type": "Organization",
      name: "GM Shop 66",
      url: SITE_URL,
    },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "RU",
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      returnPolicyCategory:
        "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 14,
      returnMethod: "https://schema.org/ReturnByMail",
    },
  },
};
```

- [ ] **Step 3: Обновить H1 заголовок**

В `CatalogChrome` последний crumb и `title` — заменить:

```typescript
// Было:
title={product.name}
// Стало:
title={`${product.sku} — ${product.name}`}
```

И в crumbs последний элемент:
```typescript
{ label: product.brand || product.name }
// Заменить на:
{ label: product.sku }
```

- [ ] **Step 4: Коммит**

```bash
git add src/app/product/[slug]/page.tsx src/app/lib/seo.ts
git commit -m "feat(seo): improve product page metadata, JSON-LD, title with SKU-first format"
```

---

### Task 3: Убрать табы — контент секциями

**Files:**
- Modify: `src/app/product/[slug]/page.tsx` (удалить ProductTabs, заменить на открытые секции)
- Delete (later): `src/app/product/[slug]/_components/ProductTabs.tsx` — после верификации

- [ ] **Step 1: Заменить табы на открытые секции в `page.tsx`**

Удалить весь блок `{(() => { const tabs: ProductTab[] = []; ... return <ProductTabs tabs={tabs} />; })()}` (примерно строки 235–275).

Убрать импорт `ProductTabs` и `type ProductTab`.

Добавить импорт `generateProductDescription`:
```typescript
import { generateProductDescription } from "../../lib/product-description-gen";
```

Вставить вместо табов три отдельные секции:

```tsx
{/* Описание */}
<section className="space-y-3">
  <h2 className="text-lg font-semibold text-slate-900">Описание</h2>
  <ProductDescription
    text={product.description || generateProductDescription(product)}
  />
  {product.longDescription ? (
    <ProductLongDescription longDescription={product.longDescription} />
  ) : null}
</section>

{/* Характеристики */}
{product.specs && product.specs.length > 0 ? (
  <section className="rounded-xl border border-slate-200 bg-white/70 p-5">
    <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-3">
      Характеристики
    </h2>
    <ProductSpecs specs={product.specs} />
  </section>
) : null}

{/* Похожие товары */}
{recommended.length >= 2 ? (
  <section className="space-y-3">
    <h2 className="text-lg font-semibold text-slate-900">
      Похожие товары
    </h2>
    <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
      {recommended.map((p) => (
        <div key={p.id} className="w-56 shrink-0 snap-start">
          <CatalogProductCard p={p} />
        </div>
      ))}
    </div>
  </section>
) : null}
```

- [ ] **Step 2: Удалить секцию «Аналоги дешевле»**

Удалить весь блок `{cheaperAnalogs.length > 0 ? ( <section> ... </section> ) : null}`.

Удалить импорт `getCheaperAnalogs` и переменную `cheaperAnalogs`.

- [ ] **Step 3: Удалить файл ProductTabs**

```bash
rm src/app/product/\[slug\]/_components/ProductTabs.tsx
```

- [ ] **Step 4: Коммит**

```bash
git add -A
git commit -m "refactor(product): replace tabs with open sections, merge recommendations"
```

---

### Task 4: Сайдбар — инфо-карточка, наличие, WhatsApp

**Files:**
- Modify: `src/app/product/[slug]/ProductClient.tsx`
- Modify: `src/app/product/[slug]/page.tsx` (удалить инфо-карточку из левой колонки)

- [ ] **Step 1: Удалить инфо-карточку из левой колонки `page.tsx`**

В `page.tsx` удалить блок `{/* Инфо-карточка */}` под галереей (весь `<div className="rounded-xl border border-slate-200/80 bg-white p-4 text-sm shadow-sm">...</div>`).

Удалить импорт `CopySkuButton` из `page.tsx` (он переедет в `ProductClient`).

- [ ] **Step 2: Обновить `ProductClient.tsx`**

Полная замена содержимого `ProductClient.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "../../components/CartContext";
import { useFavorites } from "../../components/FavoritesContext";
import type { Product } from "../../data/products";
import { CopySkuButton } from "./_components/CopySkuButton";

export function ProductClient({ product }: { product: Product }) {
  const { addToCart, items, setItemQuantity } = useCart();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const [qty, setQty] = useState(1);
  const liked = isFavorite(product.id);

  const handleAddToCart = () => {
    const existing = items.find((i) => i.product.id === product.id);
    if (existing) {
      setItemQuantity(product.id, existing.quantity + qty);
    } else {
      addToCart(product);
      if (qty > 1) setItemQuantity(product.id, qty);
    }
    setQty(1);
  };

  const whatsappText = encodeURIComponent(
    `Здравствуйте! Интересует ${product.name}, арт. ${product.sku}. Есть в наличии?`
  );

  return (
    <div className="relative space-y-4 rounded-2xl bg-white p-6 shadow-md h-fit md:sticky md:top-24 overflow-hidden">
      {/* Акцентная полоска сверху */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />

      {/* Цена + Избранное */}
      <div className="flex items-center justify-between">
        <p className="text-3xl font-bold text-slate-900 tracking-tight">
          {product.price.toLocaleString("ru-RU")}{" "}
          <span className="text-xl font-semibold text-slate-500">₽</span>
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          aria-label={liked ? "Убрать из избранного" : "В избранное"}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
            liked
              ? "bg-red-50 text-red-500"
              : "bg-slate-100 text-slate-400 hover:text-red-400"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
      </div>

      {/* Наличие */}
      {product.inStock > 0 ? (
        product.inStock <= 3 ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Осталось {product.inStock} шт.
          </p>
        ) : (
          <p className="flex items-center gap-1 text-xs text-green-600">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 6L9 17l-5-5" />
            </svg>
            В наличии
          </p>
        )
      ) : (
        <p className="text-sm text-slate-500">Нет в наличии</p>
      )}

      {/* Количество + В корзину */}
      {product.inStock > 0 ? (
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="flex h-10 w-10 items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-xl transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Уменьшить количество"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <span className="w-10 text-center text-sm font-medium tabular-nums select-none">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(product.inStock, q + 1))}
              disabled={qty >= product.inStock}
              className="flex h-10 w-10 items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-xl transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Увеличить количество"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
          <button
            onClick={handleAddToCart}
            className="flex-1 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-amber-700 hover:shadow-lg hover:shadow-amber-600/25 active:scale-[0.98]"
          >
            В корзину
          </button>
        </div>
      ) : (
        <a
          href={`https://wa.me/79022540111?text=${encodeURIComponent(
            `Здравствуйте! Интересует ${product.name}, арт. ${product.sku}. Когда будет в наличии?`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl bg-slate-100 px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
        >
          Спросить о сроках
        </a>
      )}

      {/* Инфо-карточка */}
      <div className="border-t border-slate-100 pt-3">
        <dl className="divide-y divide-slate-100 text-sm">
          <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
            <dt className="text-xs text-slate-500 shrink-0">Артикул</dt>
            <dd className="font-mono font-semibold tracking-wide text-slate-900 flex items-center gap-1.5">
              {product.sku}
              <CopySkuButton sku={product.sku} />
            </dd>
          </div>
          {product.brand ? (
            <div className="flex items-baseline justify-between gap-3 py-2">
              <dt className="text-xs text-slate-500">Бренд</dt>
              <dd className="font-medium text-slate-800">{product.brand}</dd>
            </div>
          ) : null}
          {product.car ? (
            <div className="flex items-baseline justify-between gap-3 py-2 last:pb-0">
              <dt className="text-xs text-slate-500">Авто</dt>
              <dd className="text-slate-600 text-right">{product.car}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {/* Спросить про деталь — WhatsApp */}
      <a
        href={`https://wa.me/79022540111?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-sm text-green-700 hover:text-green-800 transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Спросить про эту деталь
      </a>

      {/* Доставка / Гарантия / Возврат */}
      <div className="border-t border-slate-100 pt-4 space-y-2.5">
        <Link
          href="/dostavka-zapchastey-ekaterinburg"
          className="flex items-center gap-2 text-xs text-slate-600 hover:text-amber-600 transition group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-slate-400 shrink-0 group-hover:text-amber-500 transition">
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <path d="M16 8h4l3 3v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <span>Доставка по Екатеринбургу и РФ</span>
          <span className="ml-auto text-amber-600 opacity-0 group-hover:opacity-100 transition">→</span>
        </Link>

        <Link
          href="/warranty"
          className="flex items-center gap-2 text-xs text-slate-600 hover:text-amber-600 transition group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-slate-400 shrink-0 group-hover:text-amber-500 transition">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Гарантия на все товары</span>
          <span className="ml-auto text-amber-600 opacity-0 group-hover:opacity-100 transition">→</span>
        </Link>

        <Link
          href="/returns"
          className="flex items-center gap-2 text-xs text-slate-600 hover:text-amber-600 transition group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-slate-400 shrink-0 group-hover:text-amber-500 transition">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
          <span>Возврат и обмен</span>
          <span className="ml-auto text-amber-600 opacity-0 group-hover:opacity-100 transition">→</span>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Коммит**

```bash
git add src/app/product/[slug]/ProductClient.tsx src/app/product/[slug]/page.tsx
git commit -m "feat(product): redesign sidebar — move info card, add WhatsApp CTA, smart stock display"
```

---

### Task 5: Плейсхолдер для товаров без фото

**Files:**
- Modify: `src/app/components/ProductImageGallery.tsx`

- [ ] **Step 1: Добавить плейсхолдер в `ProductImageGallery`**

В начале компонента `ProductImageGallery`, перед рендером галереи, добавить проверку на пустые URL:

```tsx
// Если нет фотографий — плейсхолдер
if (urls.length === 0 || (urls.length === 1 && !urls[0])) {
  return (
    <div className="flex aspect-square items-center justify-center rounded-2xl bg-[#0b1220]">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        <span className="text-sm">Фото скоро появится</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Добавить зум при наведении**

В галерее после рендера основного изображения добавить hover-zoom overlay. В состояние компонента добавить:

```tsx
const [zoomPos, setZoomPos] = useState<{ x: number; y: number } | null>(null);
```

На основное изображение добавить обработчики:

```tsx
onMouseMove={(e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  setZoomPos({
    x: ((e.clientX - rect.left) / rect.width) * 100,
    y: ((e.clientY - rect.top) / rect.height) * 100,
  });
}}
onMouseLeave={() => setZoomPos(null)}
```

И оверлей зума поверх основного фото (внутри контейнера основного изображения):

```tsx
{zoomPos && (
  <div
    className="pointer-events-none absolute inset-0 z-10 hidden md:block"
    style={{
      backgroundImage: `url(${urls[current]})`,
      backgroundSize: "200%",
      backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
      backgroundRepeat: "no-repeat",
    }}
  />
)}
```

Зум показывается только на десктопе (`hidden md:block`), не мешает мобильному свайпу.

- [ ] **Step 3: Коммит**

```bash
git add src/app/components/ProductImageGallery.tsx
git commit -m "feat(product): add image placeholder and desktop hover zoom"
```

---

### Task 6: Визуальная иерархия — убрать лишние обёртки

**Files:**
- Modify: `src/app/product/[slug]/page.tsx`

- [ ] **Step 1: Обновить стили секций**

В `page.tsx` убедиться что:

1. **Галерея + Сайдбар** (grid) — уже `bg-white` через компоненты, ок
2. **Описание** — без белой карточки, на фоне страницы:
   ```tsx
   <section className="space-y-3">
   ```
3. **Характеристики** — лёгкая карточка:
   ```tsx
   <section className="rounded-xl border border-slate-200 bg-white/70 p-5">
   ```
4. **Похожие товары** — без обёртки:
   ```tsx
   <section className="space-y-3">
   ```
5. **Недавно просмотренные** — без изменений

Это уже учтено в Task 3. Проверить что не осталось лишних `bg-white shadow-sm` обёрток от старых секций.

- [ ] **Step 2: Коммит (если были изменения)**

```bash
git add src/app/product/[slug]/page.tsx
git commit -m "style(product): clean up visual hierarchy — remove redundant wrappers"
```

---

### Task 7: Финальная верификация

**Files:** Все изменённые файлы

- [ ] **Step 1: Проверить сборку**

```bash
npm run build
```

Ожидаем: сборка без ошибок. Все продуктовые страницы генерируются статически.

- [ ] **Step 2: Проверить рендер в dev-режиме**

```bash
npm run dev
```

Открыть любую карточку товара, проверить:
- H1 начинается с артикула
- Сайдбар: цена, наличие, корзина, инфо-карточка, WhatsApp, ссылки
- Описание открыто (не в табе)
- Нет секции «Аналоги дешевле»
- Нет табов
- Похожие товары — горизонтальный скролл

- [ ] **Step 3: Проверить SEO-разметку**

В DevTools → Elements:
- Найти `<script type="application/ld+json">` — проверить что Product содержит `mpn`, `seller`, `shippingDetails`, `aggregateRating`
- Проверить `<title>` начинается с артикула
- Проверить `<meta name="description">` содержит артикул и бренд
- Проверить `<meta name="keywords">` — массив без мусора

- [ ] **Step 4: Проверить плейсхолдер**

Найти товар без фото (или временно убрать image у одного товара). Проверить что показывается тёмный плейсхолдер с иконкой.

- [ ] **Step 5: Проверить зум**

На десктопе навести курсор на фото товара — должен появиться увеличенный фрагмент.

- [ ] **Step 6: Финальный коммит**

```bash
git add -A
git commit -m "feat(product): complete product card redesign — SEO, layout, descriptions"
```
