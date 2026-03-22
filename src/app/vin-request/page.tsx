import type { Metadata } from "next";
import Link from "next/link";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { SimpleDoc } from "../components/legal/SimpleDoc";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "VIN-запрос",
  description: "Подбор запчастей по VIN — Astra Motors, Екатеринбург.",
  alternates: { canonical: "/vin-request" },
};

export default function VinRequestPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "VIN-запрос", item: `${SITE_URL}/vin-request` },
    ],
  };

  return (
    <div className="space-y-6 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <CatalogChrome
        crumbs={[{ label: "Главная", href: "/" }, { label: "VIN-запрос" }]}
        title="VIN-запрос"
        description="Укажите VIN автомобиля и нужный узел или артикул — подберём совместимые детали."
      />
      <SimpleDoc title="Как оформить запрос">
        <p>
          Пришлите VIN (17 знаков на стойке кузова или в ПТС), марку/модель и что нужно подобрать. Можно приложить
          фото старой детали или схему.
        </p>
        <p>
          <Link
            href="/contacts"
            className="inline-flex rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition"
          >
            Перейти к контактам
          </Link>
        </p>
      </SimpleDoc>
    </div>
  );
}
