import Link from "next/link";
import type { Metadata } from "next";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { ProductCatalog } from "../components/ProductCatalog";
import { getAllProducts } from "../lib/products-db";
import { SITE_BRAND, SITE_URL } from "../lib/site";
import { socialShareMetadata } from "../lib/seo";

export const metadata: Metadata = {
  title: "Каталог запчастей",
  description:
    "Каталог GM Shop: автозапчасти GM — Opel и Chevrolet. Поиск по артикулу, группы и витрина по типу детали. Оригинал и аналоги.",
  alternates: { canonical: "/catalog" },
  ...socialShareMetadata({
    title: `Каталог запчастей — ${SITE_BRAND}`,
    description:
      "Opel и Chevrolet: фильтры, свечи, расходники и другое. Поиск по номеру детали. Екатеринбург.",
    path: "/catalog",
  }),
};

export default function CatalogPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Каталог", item: `${SITE_URL}/catalog` },
    ],
  };

  return (
    <div className="space-y-6 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <CatalogChrome
        crumbs={[
          { label: "Главная", href: "/" },
          { label: "Каталог" },
        ]}
        title="Каталог запчастей"
        description={
          <>
            Ищите по названию или артикулу. Не нашли нужное —{" "}
            <Link href="/contacts" className="font-medium text-amber-800 underline-offset-2 hover:underline">
              напишите нам
            </Link>
            , подберём.
          </>
        }
      />

      <ProductCatalog hideHubIntro products={getAllProducts()} />
    </div>
  );
}
