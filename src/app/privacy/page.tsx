import type { Metadata } from "next";
import Link from "next/link";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { SimpleDoc } from "../components/legal/SimpleDoc";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Обработка персональных данных",
  description: "Политика обработки персональных данных Astra Motors.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Обработка персональных данных",
        item: `${SITE_URL}/privacy`,
      },
    ],
  };

  return (
    <div className="space-y-6 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <CatalogChrome
        crumbs={[{ label: "Главная", href: "/" }, { label: "Обработка персональных данных" }]}
        title="Обработка персональных данных"
      />
      <SimpleDoc title="Общие положения">
        <p>
          Обрабатываем персональные данные (ФИО, телефон, e-mail и др.), которые вы указываете при регистрации,
          оформлении заказа или обращении к нам, — для исполнения договора, связи с вами и улучшения сервиса.
        </p>
        <p>
          Передача третьим лицам — только если это необходимо для доставки или по требованию закона. Храним данные
          в разумный срок, предусмотренный законодательством РФ.
        </p>
        <p>
          По вопросам ПДн:{" "}
          <Link href="/contacts" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            контакты
          </Link>
          .
        </p>
      </SimpleDoc>
    </div>
  );
}
