import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductImage } from "../../components/ProductImage";
import { products } from "../../data/products";
import { ProductClient } from "./ProductClient";

const siteUrl = "https://astramotors.shop";

// Чтобы Next при сборке однозначно прегенерировал все `/product/:id`,
// и `params.id` не приходил `undefined` на старых/нестабильных окружениях.
export const dynamicParams = false;
export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const product = products.find((p) => String(p.id) === String(params.id));

  if (!product) {
    return {
      title: "Товар — Astra Motors",
      robots: { index: false, follow: false },
    };
  }

  const title = `${product.name} — ${product.brand}`;
  const description = `${product.description} Марка: ${product.brand}. Авто: ${product.car}. Артикул: ${product.sku}.`;
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

export default function ProductPage({ params }: { params: { id: string } }) {
  const product = products.find((p) => String(p.id) === String(params.id));
  if (!product) return notFound();

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

      <Link href="/" className="inline-block text-sm text-sky-600 hover:text-sky-700 font-medium">
        ← Назад в каталог
      </Link>
      <div className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
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
          <p className="text-sm text-slate-500">
            Марка: {product.brand} • Авто: {product.car}
          </p>
          <p className="text-sm text-slate-500">Артикул: {product.sku}</p>
        </div>
        <ProductClient product={product} />
      </div>
    </div>
  );
}