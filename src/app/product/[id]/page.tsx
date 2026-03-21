import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductImage } from "../../components/ProductImage";
import { products } from "../../data/products";
import { getCheaperAnalogs } from "../../lib/product-analogs";
import { ProductClient } from "./ProductClient";
import { use } from "react";

const siteUrl = "https://astramotors.shop";

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
      url: `${siteUrl}${url}`,
      type: "article",
      images: product.image ? [{ url: `${siteUrl}${product.image}` }] : undefined,
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
        name: "Каталог",
        item: siteUrl + "/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.name,
        item: siteUrl + `/product/${product.id}`,
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
    image: product.image ? [siteUrl + product.image] : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      price: product.price,
      availability:
        product.inStock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: siteUrl + `/product/${product.id}`,
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

      <Link href="/" className="inline-block text-sm text-rose-600 hover:text-rose-700 font-medium">
        ← Назад в каталог
      </Link>
      <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
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
          <h1 className="text-xl font-semibold">{product.name}</h1>
          <p className="text-sm text-slate-600">{product.description}</p>

          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 space-y-3 text-sm">
            <p className="text-base font-semibold text-slate-900 border-l-4 border-rose-500 pl-3">
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
        <section className="rounded-xl border border-rose-100 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Аналоги дешевле</h2>
          <p className="text-xs text-slate-500">
            Варианты из того же каталога (ваша выгрузка), цена ниже текущей карточки.
          </p>
          <ul className="space-y-2">
            {cheaperAnalogs.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/product/${a.id}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-200 px-4 py-3 hover:border-rose-300 hover:bg-rose-50/40 transition"
                >
                  <div>
                    <span className="font-medium text-slate-900 line-clamp-2">{a.name}</span>
                    <span className="block text-xs text-slate-500 mt-1">
                      Номер: <span className="font-mono">{a.sku}</span> • {a.brand} •{" "}
                      {a.category}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-rose-600 whitespace-nowrap">
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
