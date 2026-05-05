import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CatalogChrome } from "../../components/catalog/CatalogChrome";
import { ProductImageGallery } from "../../components/ProductImageGallery";
import { getAllProducts, getProductImageUrls, getProductBySlug } from "../../lib/products-db";
import { getProductSlug, productPath } from "../../lib/product-slug";
import { ProductClient } from "./ProductClient";
import { ProductDescription } from "../../components/ProductDescription";
import { ProductSpecs } from "./_components/ProductSpecs";
import { ProductLongDescription } from "./_components/ProductLongDescription";
import { ExpandableDescription } from "./_components/ExpandableDescription";
import { TrackProductView, RecentlyViewed } from "../../components/RecentlyViewed";
import { CatalogProductCard } from "../../components/catalog/CatalogProductCard";
import { ShareButton } from "./_components/ShareButton";
import { use } from "react";
import {
  OFFER_PRICE_VALID_UNTIL,
  SEO_LOCALE,
  SITE_LANGUAGE,
  defaultOgImages,
} from "../../lib/seo";
import { SITE_BRAND, SITE_URL } from "../../lib/site";
import { CATALOG_SECTIONS } from "../../data/catalog-sections";
import {
  generateProductTitle,
  generateProductMetaDescription,
  generateProductKeywords,
  generateProductDescription,
} from "../../lib/product-description-gen";

export const dynamicParams = true;
export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: getProductSlug(p) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string }>;
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
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const product = getProductBySlug(slug);
  if (!product) return notFound();

  const imageUrls = getProductImageUrls(product);
  const canonicalPath = productPath(product);

  /* Рекомендуемые: та же категория, исключая текущий, макс 6 */
  const recommended = getAllProducts()
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
          { label: product.sku },
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

        </div>
        <ProductClient product={product} />
      </div>

      <TrackProductView productId={product.id} />

      {/* Описание */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Описание</h2>
        <ProductDescription text={generateProductDescription(product)} />
        {product.description ? (
          <ExpandableDescription text={product.description} />
        ) : null}
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

      <RecentlyViewed excludeId={product.id} />
    </div>
  );
}
