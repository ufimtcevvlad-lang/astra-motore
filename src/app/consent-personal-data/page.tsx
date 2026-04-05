import type { Metadata } from "next";
import Link from "next/link";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { SimpleDoc } from "../components/legal/SimpleDoc";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSIONS } from "../lib/legal-docs";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Согласие на обработку персональных данных",
  description: "Форма согласия на обработку персональных данных пользователей сайта gmshop 66.",
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
        <p className="text-sm text-slate-500">
          Дата вступления в силу: {LEGAL_EFFECTIVE_DATE}. Версия документа: {LEGAL_VERSIONS.consentPersonalData}.
        </p>
        <p>
          Настоящим, оставляя данные на сайте gmshop 66, я свободно, своей волей и в своем интересе даю согласие
          Индивидуальному предпринимателю Невьянцеву Антону Александровичу на обработку моих персональных данных на
          следующих условиях:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>обработка осуществляется в целях обработки заказов, запросов по идентификационному номеру автомобиля и обратной связи;</li>
          <li>перечень данных: фамилия, имя, отчество, номер телефона, адрес электронной почты, идентификационный номер автомобиля, данные об автомобиле, комментарии и вложения;</li>
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
        <h2 className="text-lg font-semibold text-slate-900">Порядок отзыва согласия</h2>
        <p>
          Для отзыва согласия направьте обращение с темой «Отзыв согласия на обработку персональных данных» через
          страницу{" "}
          <Link href="/contacts" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            Контакты
          </Link>
          . В обращении укажите ФИО, номер телефона и описание запроса для корректной идентификации.
        </p>
        <p>
          Срок рассмотрения обращения составляет до 30 календарных дней с даты получения запроса, если иной срок не
          установлен законодательством Российской Федерации.
        </p>
      </SimpleDoc>
    </div>
  );
}
