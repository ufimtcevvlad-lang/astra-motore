import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CatalogChrome } from "../../components/catalog/CatalogChrome";
import { ProductImageGallery } from "../../components/ProductImageGallery";
import { getProductImageUrls, products } from "../../data/products";
import { getCheaperAnalogs } from "../../lib/product-analogs";
import { getProductBySlug, getProductSlug, productPath } from "../../lib/product-slug";
import { ProductClient } from "./ProductClient";
import { plainProductDescription, ProductDescription } from "../../components/ProductDescription";
import { ProductSpecs } from "./_components/ProductSpecs";
import { ProductLongDescription } from "./_components/ProductLongDescription";
import { ProductTabs, type ProductTab } from "./_components/ProductTabs";
import { TrackProductView, RecentlyViewed } from "../../components/RecentlyViewed";
import { CatalogProductCard } from "../../components/catalog/CatalogProductCard";
import { CopySkuButton } from "./_components/CopySkuButton";
import { ShareButton } from "./_components/ShareButton";
import { use } from "react";
import {
  OFFER_PRICE_VALID_UNTIL,
  SEO_LOCALE,
  SITE_LANGUAGE,
  defaultOgImages,
  truncateMetaDescription,
} from "../../lib/seo";
import { SITE_BRAND, SITE_URL } from "../../lib/site";
import { CATALOG_SECTIONS } from "../../data/catalog-sections";

export const dynamicParams = false;
export function generateStaticParams() {
  return products.map((p) => ({ slug: getProductSlug(p) }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug?: string } | Promise<{ slug?: string }>;
}): Promise<Metadata> {
  const resolved = (await params) || {};
  const slug = resolved?.slug;

  const product = slug ? getProductBySlug(slug) : undefined;

  if (!product) {
    return {
      title: `Каталог товаров — ${SITE_BRAND}`,
      description:
        "Подбор запчастей по артикулу. Оригинальные детали и качественные аналоги.",
      robots: { index: true, follow: true },
      alternates: { canonical: "/catalog" },
    };
  }

  const title = `${product.name} — ${product.brand}`;
  const description = truncateMetaDescription(
    `${plainProductDescription(product.description)} Категория: ${product.category}. Бренд: ${product.brand}. Артикул: ${product.sku}.`,
  );
  const url = productPath(product);
  const galleryUrls = getProductImageUrls(product);
  const ogImages =
    galleryUrls.length > 0
      ? galleryUrls.map((u) => ({ url: `${SITE_URL}${u}` }))
      : defaultOgImages();

  const keywords = [
    product.sku,
    product.brand,
    product.category,
    "запчасть Opel",
    "запчасть Chevrolet",
    "GM Shop",
    "Екатеринбург",
  ];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${url}`,
      siteName: SITE_BRAND,
      locale: SEO_LOCALE,
      type: "website",
      images: ogImages,
    },
  };
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const product = getProductBySlug(slug);
  if (!product) return notFound();

  const cheaperAnalogs = getCheaperAnalogs(product, products);
  const imageUrls = getProductImageUrls(product);
  const canonicalPath = productPath(product);

  /* Рекомендуемые: та же категория, исключая текущий, макс 6 */
  const recommended = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 6);

  /* Секция каталога по категории товара */
  const catalogSection = CATALOG_SECTIONS.find((s) => s.title === product.category);
  const categoryHref = catalogSection
    ? `/catalog#catalog-${catalogSection.slug}`
    : "/catalog";

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Главная",
        item: SITE_URL + "/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Каталог",
        item: SITE_URL + "/catalog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.category,
        item: SITE_URL + categoryHref,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: product.name,
        item: SITE_URL + canonicalPath,
      },
    ],
  };

  const additionalProperty =
    product.specs && product.specs.length > 0
      ? product.specs.map((s) => ({
          "@type": "PropertyValue",
          name: s.label,
          value: s.value,
        }))
      : undefined;

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: plainProductDescription(product.description),
    sku: product.sku,
    category: product.category,
    brand: { "@type": "Brand", name: product.brand },
    image: imageUrls.length > 0 ? imageUrls.map((u) => SITE_URL + u) : undefined,
    itemCondition: "https://schema.org/NewCondition",
    inLanguage: SITE_LANGUAGE,
    additionalProperty,
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: product.price,
      availability:
        product.inStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: SITE_URL + canonicalPath,
      itemCondition: "https://schema.org/NewCondition",
      priceValidUntil: OFFER_PRICE_VALID_UNTIL,
    },
  };

  // JSON-LD данные безопасны — формируются из наших собственных данных в products.ts
  const breadcrumbJson = JSON.stringify(breadcrumbLd);
  const productJson = JSON.stringify(productLd);

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbJson }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: productJson }}
      />

      <CatalogChrome
        crumbs={[
          { label: "Главная", href: "/" },
          { label: "Каталог", href: "/catalog" },
          { label: product.category, href: categoryHref },
          { label: product.brand },
        ]}
        title={product.name}
      />

      <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <div className="relative">
            <ProductImageGallery alt={`${product.name}, арт. ${product.sku}`} urls={imageUrls} />
            <div className="absolute right-2 top-2 z-20">
              <ShareButton title={product.name} url={canonicalPath} />
            </div>
          </div>

          {/* Инфо-карточка */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 text-sm shadow-sm">
            <dl className="divide-y divide-slate-100">
              <div className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0">
                <dt className="text-xs text-slate-500 shrink-0">Артикул</dt>
                <dd className="font-mono font-semibold tracking-wide text-slate-900 flex items-center gap-1.5">
                  {product.sku}
                  <CopySkuButton sku={product.sku} />
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-xs text-slate-500">Бренд</dt>
                <dd className="font-medium text-slate-800">{product.brand}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5">
                <dt className="text-xs text-slate-500">Страна</dt>
                <dd className="text-slate-700">{product.country}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3 py-2.5 last:pb-0">
                <dt className="text-xs text-slate-500">Авто</dt>
                <dd className="text-slate-600 text-right">{product.car}</dd>
              </div>
            </dl>
          </div>
        </div>
        <ProductClient product={product} />
      </div>

      <TrackProductView productId={product.id} />

      {(() => {
        const tabs: ProductTab[] = [];

        tabs.push({
          key: "description",
          title: "Описание",
          content: (
            <div className="space-y-4">
              <ProductDescription text={product.description} />
              {product.longDescription ? (
                <ProductLongDescription longDescription={product.longDescription} />
              ) : null}
            </div>
          ),
        });

        if (product.specs && product.specs.length > 0) {
          tabs.push({
            key: "specs",
            title: "Характеристики",
            content: <ProductSpecs specs={product.specs} />,
          });
        }

        if (recommended.length >= 2) {
          tabs.push({
            key: "recommended",
            title: "Рекомендуем",
            content: (
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                {recommended.map((p) => (
                  <div key={p.id} className="w-56 shrink-0 snap-start">
                    <CatalogProductCard p={p} />
                  </div>
                ))}
              </div>
            ),
          });
        }

        return <ProductTabs tabs={tabs} />;
      })()}

      {cheaperAnalogs.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-2">
            Аналоги дешевле
          </h2>
          <p className="text-xs text-slate-500">
            Варианты из того же каталога (ваша выгрузка), цена ниже текущей карточки.
          </p>
          <ul className="space-y-2">
            {cheaperAnalogs.map((a) => (
              <li key={a.id}>
                <Link
                  href={productPath(a)}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-200 px-4 py-3 hover:border-amber-300 hover:bg-amber-50/40 transition"
                >
                  <div>
                    <span className="font-medium text-slate-900 line-clamp-2">{a.name}</span>
                    <span className="block text-xs text-slate-500 mt-1">
                      Номер: <span className="font-mono">{a.sku}</span> • {a.brand} •{" "}
                      {a.category}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-amber-600 whitespace-nowrap">
                    {a.price.toLocaleString("ru-RU")} ₽
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}
