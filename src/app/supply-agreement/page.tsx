import type { Metadata } from "next";
import Link from "next/link";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { SimpleDoc } from "../components/legal/SimpleDoc";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Договор поставки",
  description: "Условия поставки запчастей Astra Motors.",
  alternates: { canonical: "/supply-agreement" },
};

export default function SupplyAgreementPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Договор поставки", item: `${SITE_URL}/supply-agreement` },
    ],
  };

  return (
    <div className="space-y-6 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <CatalogChrome
        crumbs={[{ label: "Главная", href: "/" }, { label: "Договор поставки" }]}
        title="Договор поставки"
      />
      <SimpleDoc title="Договор поставки">
        <p>
          Условия поставки, оплаты и ответственности согласовываются при оформлении заказа. Полный текст договора
          или коммерческого предложения можно запросить у менеджера.
        </p>
        <p>
          <Link href="/contacts" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            Связаться с нами
          </Link>
        </p>
      </SimpleDoc>
    </div>
  );
}
