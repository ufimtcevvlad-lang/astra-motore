import type { Metadata } from "next";
import Link from "next/link";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { SimpleDoc } from "../components/legal/SimpleDoc";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Гарантия",
  description: "Положение о гарантии на запчасти Astra Motors.",
  alternates: { canonical: "/warranty" },
};

export default function WarrantyPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Гарантия", item: `${SITE_URL}/warranty` },
    ],
  };

  return (
    <div className="space-y-6 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <CatalogChrome crumbs={[{ label: "Главная", href: "/" }, { label: "Гарантия" }]} title="Гарантия" />
      <SimpleDoc title="Положение о гарантии">
        <p>
          Гарантийные обязательства зависят от типа детали (оригинал / аналог) и условий поставщика. Сроки и порядок
          обмена или возврата уточняйте при покупке и в документах к заказу.
        </p>
        <p>
          <Link href="/contacts" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            Задать вопрос менеджеру
          </Link>
        </p>
      </SimpleDoc>
    </div>
  );
}
