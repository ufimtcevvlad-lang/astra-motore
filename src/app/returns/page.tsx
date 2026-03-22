import type { Metadata } from "next";
import Link from "next/link";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { SimpleDoc } from "../components/legal/SimpleDoc";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Возврат",
  description: "Условия возврата запчастей Astra Motors.",
  alternates: { canonical: "/returns" },
};

export default function ReturnsPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Возврат", item: `${SITE_URL}/returns` },
    ],
  };

  return (
    <div className="space-y-6 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <CatalogChrome crumbs={[{ label: "Главная", href: "/" }, { label: "Возврат" }]} title="Возврат" />
      <SimpleDoc title="Возврат товара">
        <p>
          Возврат возможен при сохранении товарного вида, упаковки и в сроки, согласованные при покупке, с учётом
          закона о защите прав потребителей и специфики автозапчастей.
        </p>
        <p>
          Перед возвратом свяжитесь с менеджером:{" "}
          <Link href="/contacts" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            контакты
          </Link>
          .
        </p>
      </SimpleDoc>
    </div>
  );
}
