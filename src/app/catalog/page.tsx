import Link from "next/link";
import type { Metadata } from "next";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { ProductCatalog } from "../components/ProductCatalog";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Каталог запчастей",
  description:
    "Каталог Astra Motors: автозапчасти GM — Opel и Chevrolet. Поиск по артикулу, группы и витрина по типу детали. Оригинал и аналоги.",
  alternates: { canonical: "/catalog" },
  openGraph: {
    title: "Каталог запчастей — Astra Motors",
    description: "Opel и Chevrolet: фильтры, свечи, расходники и другое. Екатеринбург.",
    url: `${SITE_URL}/catalog`,
    type: "website",
  },
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
    <div className="space-y-8">
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
            Путь: <strong className="text-slate-800">Главная → Каталоги (шапка) → Витрина</strong>. Здесь поиск, фильтр по
            марке и рубрики по типу детали. Нужна позиция не из списка —{" "}
            <Link href="/contacts" className="text-amber-800 font-medium hover:underline">
              напишите менеджеру
            </Link>
            .
          </>
        }
      />

      <ProductCatalog hideHubIntro />
    </div>
  );
}
