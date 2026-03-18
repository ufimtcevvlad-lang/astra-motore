import ProductPageClient from "./ProductPageClient";
import type { Metadata } from "next";
import { products } from "../../data/products";

const siteUrl = "https://astramotors.shop";

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const product = products.find((p) => String(p.id) === String(params.id));
  if (!product) {
    return {
      title: "Товар не найден",
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

export default function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  // Рендер содержимого — в client-компоненте, чтобы `id` гарантированно читался через `useParams()`.
  // `generateMetadata` остаётся server-side для SEO.
  return <ProductPageClient />;
}