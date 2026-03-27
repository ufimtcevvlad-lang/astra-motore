import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CatalogChrome } from "../../components/catalog/CatalogChrome";
import { ProductImage } from "../../components/ProductImage";
import { products } from "../../data/products";
import { getCheaperAnalogs } from "../../lib/product-analogs";
import { ProductClient } from "./ProductClient";
import { use } from "react";
import { SITE_URL } from "../../lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: { id?: string } | Promise<{ id?: string }>;
}): Promise<Metadata> {
  const resolved = (await params) || {};
  const id = resolved?.id;

  const product = id
    ? products.find((p) => String(p.id) === String(id))
    : undefined;

  if (!product) {
    return {
      title: "Каталог товаров — Astra Motors",
      description:
        "Подбор запчастей по артикулу. Оригинальные детали и качественные аналоги.",
      robots: { index: true, follow: true },
      alternates: { canonical: "/product" },
    };
  }

  const title = `${product.name} — ${product.brand}`;
  const description = `${product.description} Категория: ${product.category}. Бренд: ${product.brand}. Страна: ${product.country}. Артикул: ${product.sku}.`;
  const url = `/product/${product.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${url}`,
      type: "article",
      images: product.image ? [{ url: `${SITE_URL}${product.image}` }] : undefined,
    },
  };
}

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const product = products.find((p) => String(p.id) === String(id));
  if (!product) return notFound();

  const cheaperAnalogs = getCheaperAnalogs(product, products);

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
        item: SITE_URL + `/product/${product.id}`,
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
    image: product.image ? [SITE_URL + product.image] : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: product.price,
      availability:
        product.inStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: SITE_URL + `/product/${product.id}`,
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
          <div className="aspect-[4/3] relative rounded-lg bg-slate-100 overflow-hidden">
            <ProductImage
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
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

          {product.specs && product.specs.length > 0 ? (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Характеристики</h2>
              <dl className="mt-3 divide-y divide-slate-100 text-sm">
                {product.specs.map((item) => (
                  <div key={`${item.label}-${item.value}`} className="grid grid-cols-1 gap-1 py-2 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-3">
                    <dt className="text-slate-500">{item.label}</dt>
                    <dd className="font-medium text-slate-800">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {product.oemRefs && product.oemRefs.length > 0 ? (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">OEM и кросс-номера</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.oemRefs.map((ref) => (
                  <span key={ref} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-mono text-slate-700">
                    {ref}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {product.technicalNotes && product.technicalNotes.length > 0 ? (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Технические данные и примечания</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
                {product.technicalNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <ProductClient product={product} />
      </div>

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
                  href={`/product/${a.id}`}
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
