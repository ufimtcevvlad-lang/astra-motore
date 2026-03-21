import Link from "next/link";
import type { Metadata } from "next";
import { ProductCatalog } from "../components/ProductCatalog";

const siteUrl = "https://astramotors.shop";

export const metadata: Metadata = {
  title: "Каталог запчастей",
  description:
    "Каталог Astra Motors: автозапчасти GM — Opel и Chevrolet. Поиск по артикулу, группы и витрина по типу детали. Оригинал и аналоги.",
  alternates: { canonical: "/catalog" },
  openGraph: {
    title: "Каталог запчастей — Astra Motors",
    description: "Opel и Chevrolet: фильтры, свечи, расходники и другое. Екатеринбург.",
    url: `${siteUrl}/catalog`,
    type: "website",
  },
};

export default function CatalogPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl + "/" },
      { "@type": "ListItem", position: 2, name: "Каталог", item: siteUrl + "/catalog" },
    ],
  };

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="space-y-2">
        <nav className="text-xs text-slate-500">
          <Link href="/" className="hover:text-amber-600">
            Главная
          </Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Каталог</span>
        </nav>
        <h1 className="text-2xl font-bold text-slate-900">Каталог запчастей</h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Витрина по типу детали, фильтр по марке и поиск. Нужна позиция не из списка —{" "}
          <Link href="/contacts" className="text-amber-700 font-medium hover:underline">
            напишите менеджеру
          </Link>
          .
        </p>
      </div>

      <ProductCatalog />
    </div>
  );
}
