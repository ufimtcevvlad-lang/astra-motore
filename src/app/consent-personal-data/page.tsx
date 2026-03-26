import type { Metadata } from "next";
import Link from "next/link";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { SimpleDoc } from "../components/legal/SimpleDoc";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Согласие на обработку персональных данных",
  description: "Форма согласия на обработку персональных данных пользователей сайта Astra Motors.",
  alternates: { canonical: "/consent-personal-data" },
};

export default function ConsentPersonalDataPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Согласие на обработку персональных данных",
        item: `${SITE_URL}/consent-personal-data`,
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
        crumbs={[{ label: "Главная", href: "/" }, { label: "Согласие на обработку персональных данных" }]}
        title="Согласие на обработку персональных данных"
      />
      <SimpleDoc title="Согласие субъекта на обработку персональных данных">
        <p>
          Настоящим, оставляя данные на сайте Astra Motors, я свободно, своей волей и в своем интересе даю согласие
          Индивидуальному предпринимателю Невьянцеву Антону Александровичу на обработку моих персональных данных на
          следующих условиях:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>обработка осуществляется в целях обработки заказов, VIN-запросов и обратной связи;</li>
          <li>перечень данных: ФИО, телефон, e-mail, VIN, данные об автомобиле, комментарии и вложения;</li>
          <li>действия с данными: сбор, запись, хранение, уточнение, использование, передача в установленных случаях, удаление;</li>
          <li>обработка может осуществляться как автоматизированно, так и без использования средств автоматизации.</li>
        </ul>
        <p>
          Я подтверждаю, что ознакомлен(а) с{" "}
          <Link href="/privacy" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            Политикой обработки персональных данных
          </Link>
          .
        </p>
        <p>
          Согласие действует до достижения целей обработки либо до его отзыва субъектом персональных данных.
          Согласие может быть отозвано путем направления обращения через страницу{" "}
          <Link href="/contacts" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            Контакты
          </Link>
          .
        </p>
      </SimpleDoc>
    </div>
  );
}
