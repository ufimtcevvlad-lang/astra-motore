import type { Metadata } from "next";
import Link from "next/link";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { SimpleDoc } from "../components/legal/SimpleDoc";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "О компании",
  description: "Astra Motors — автозапчасти GM, Opel и Chevrolet в Екатеринбурге.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "О компании", item: `${SITE_URL}/about` },
    ],
  };

  return (
    <div className="space-y-6 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <CatalogChrome
        crumbs={[{ label: "Главная", href: "/" }, { label: "О компании" }]}
        title="О компании"
      />
      <SimpleDoc title="Astra Motors">
        <p>
          Мы специализируемся на автозапчастях GM для автомобилей Opel и Chevrolet: подбор по артикулу,
          оригинальные детали и проверенные аналоги, доставка по Екатеринбургу.
        </p>
        <p>
          Каталог на сайте и консультация менеджера — если позиции нет в списке,{" "}
          <Link href="/contacts" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            напишите или позвоните
          </Link>
          .
        </p>
      </SimpleDoc>
    </div>
  );
}
