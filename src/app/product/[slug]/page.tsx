import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CatalogChrome } from "../../components/catalog/CatalogChrome";
import { ProductImageGallery } from "../../components/ProductImageGallery";
import { getProductImageUrls, products } from "../../data/products";
import { getCheaperAnalogs } from "../../lib/product-analogs";
import { getProductBySlug, getProductSlug, productPath } from "../../lib/product-slug";
import { ProductClient } from "./ProductClient";
import { use } from "react";
import { SITE_URL } from "../../lib/site";

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
      title: "Каталог товаров — gmshop 66",
      description:
        "Подбор запчастей по артикулу. Оригинальные детали и качественные аналоги.",
      robots: { index: true, follow: true },
      alternates: { canonical: "/catalog" },
    };
  }

  const title = `${product.name} — ${product.brand}`;
  const description = `${product.description} Категория: ${product.category}. Бренд: ${product.brand}. Страна: ${product.country}. Артикул: ${product.sku}.`;
  const url = productPath(product);
  const galleryUrls = getProductImageUrls(product);
  const ogImages = galleryUrls.map((u) => ({ url: `${SITE_URL}${u}` }));

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${url}`,
      type: "article",
      images: ogImages.length > 0 ? ogImages : undefined,
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
        name: product.name,
        item: SITE_URL + canonicalPath,
      },
    ],
  };

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand },
    image: imageUrls.length > 0 ? imageUrls.map((u) => SITE_URL + u) : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: product.price,
      availability:
        product.inStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: SITE_URL + canonicalPath,
    },
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />

      <CatalogChrome
        crumbs={[
          { label: "Главная", href: "/" },
          { label: "Каталог", href: "/catalog" },
          { label: "Товар" },
        ]}
        title={product.name}
        description={
          <p className="text-slate-600">
            {product.category} • {product.brand} • арт. {product.sku}
          </p>
        }
      />

      <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            {product.category}
          </p>
          <ProductImageGallery alt={`${product.name}, арт. ${product.sku}`} urls={imageUrls} />
          <p className="text-sm text-slate-600">{product.description}</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-3 text-sm">
            <p className="text-base font-semibold text-slate-900 border-l-4 border-amber-500 pl-3">
              Номер запчасти:{" "}
              <span className="font-mono tracking-wide">{product.sku}</span>
            </p>
            <p className="text-slate-700">
              <span className="font-medium text-slate-900">Бренд:</span> {product.brand}
            </p>
            <p className="text-slate-700">
              <span className="font-medium text-slate-900">Страна:</span> {product.country}
            </p>
            <p className="text-slate-600">
              <span className="font-medium text-slate-800">Применяемость:</span> {product.car}
            </p>
          </div>
        </div>
        <ProductClient product={product} />
      </div>

      {cheaperAnalogs.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-sem-semibold text-slate-900 border-b border-slate-200 pb-2 mb-2">
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
    </div>
  );
}
