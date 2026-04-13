import type { Metadata } from "next";
import Link from "next/link";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { SimpleDoc } from "../components/legal/SimpleDoc";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSIONS } from "../lib/legal-docs";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Способы оплаты",
  description: "Способы оплаты в GM Shop: наличные, онлайн-оплата картой с защитой PCI DSS, перевод по реквизитам. Безопасные платежи на gmshop66.ru.",
  alternates: { canonical: "/payment" },
};

export default function PaymentPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Способы оплаты", item: `${SITE_URL}/payment` },
    ],
  };

  return (
    <div className="space-y-6 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <CatalogChrome crumbs={[{ label: "Главная", href: "/" }, { label: "Способы оплаты" }]} title="Способы оплаты" />
      <SimpleDoc title="Способы оплаты">
        <p className="text-sm text-slate-500">
          Дата вступления в силу: {LEGAL_EFFECTIVE_DATE}. Версия документа: {LEGAL_VERSIONS.payment}.
        </p>
        <p>
          Настоящий раздел описывает доступные способы оплаты товаров в интернет-магазине GM Shop (gmshop66.ru),
          порядок списания денежных средств и условия возврата.
        </p>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">1. Доступные способы оплаты</h2>

        <h3 className="text-base font-semibold text-slate-800 mt-4">Наличные при самовывозе</h3>
        <p>
          Оплата наличными денежными средствами производится в момент получения товара при самовывозе из пункта
          выдачи. Адрес и время работы указаны в разделе{" "}
          <Link href="/contacts" className="text-amber-600 hover:underline">
            Контакты
          </Link>
          .
        </p>

        <h3 className="text-base font-semibold text-slate-800 mt-4">Онлайн-оплата банковской картой</h3>
        <p>
          Оплата принимается банковскими картами Visa, Mastercard и МИР через защищённый платёжный шлюз.
          Данные карты вводятся на защищённой странице платёжного провайдера — интернет-магазин не имеет доступа
          к реквизитам карты в процессе оплаты.
        </p>

        <h3 className="text-base font-semibold text-slate-800 mt-4">Перевод по реквизитам</h3>
        <p>
          Для юридических лиц и при наличии предварительной договорённости с менеджером возможна оплата
          безналичным переводом по банковским реквизитам. Реквизиты предоставляются менеджером после
          согласования заказа.
        </p>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">2. Безопасность платежей</h2>
        <p>
          GM Shop не хранит данные банковских карт Покупателей. Все транзакции обрабатываются платёжным
          провайдером, сертифицированным по стандарту PCI DSS. Передача данных осуществляется по протоколу
          SSL/TLS с шифрованием.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>данные карты не передаются и не сохраняются на серверах интернет-магазина;</li>
          <li>платёжный провайдер имеет сертификацию PCI DSS;</li>
          <li>соединение защищено протоколом SSL/TLS;</li>
          <li>при подозрении на мошенничество транзакция может быть заблокирована банком-эмитентом.</li>
        </ul>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">3. Момент списания денежных средств</h2>
        <p>
          При онлайн-оплате денежные средства списываются в момент подтверждения заказа. Совершая оплату,
          Покупатель подтверждает своё согласие с условиями{" "}
          <Link href="/supply-agreement" className="text-amber-600 hover:underline">
            Договора-оферты
          </Link>
          .
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>списание производится однократно в момент подтверждения;</li>
          <li>повторное списание без согласия Покупателя не производится;</li>
          <li>при невозможности обработать заказ средства возвращаются в полном объёме.</li>
        </ul>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">4. Возврат денежных средств</h2>
        <p>
          При наступлении оснований для возврата, предусмотренных законодательством или{" "}
          <Link href="/returns" className="text-amber-600 hover:underline">
            Положением о возврате
          </Link>
          , денежные средства возвращаются на ту же банковскую карту, с которой производилась оплата.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>срок зачисления — от 3 до 10 рабочих дней в зависимости от банка-эмитента и платёжной системы;</li>
          <li>
            если карта, с которой производилась оплата, недействительна или недоступна, возврат производится
            на иной банковский счёт Покупателя на основании письменного заявления;
          </li>
          <li>стоимость доставки, если она была оказана, возврату не подлежит, если иное не предусмотрено законом.</li>
        </ul>
      </SimpleDoc>
    </div>
  );
}
