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
          Возврат товара возможен в случаях, предусмотренных законодательством РФ и настоящими условиями, с учетом
          специфики автозапчастей.
        </p>
        <h2 className="text-lg font-semibold text-slate-900">1. Общие условия возврата</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>товар не должен быть в эксплуатации;</li>
          <li>сохранены товарный вид, упаковка, комплектность, маркировка, ярлыки и пломбы (если применимо);</li>
          <li>отсутствуют следы установки, загрязнения, масляные пятна и механические повреждения;</li>
          <li>обращение подано в сроки, предусмотренные законом и условиями продажи.</li>
        </ul>
        <h2 className="text-lg font-semibold text-slate-900">2. Если товар не подошел по применимости</h2>
        <p>
          При самостоятельном подборе товара на сайте Продавец несет ответственность за применимость товара к
          автомобилю Покупателя, если Покупатель корректно указал данные автомобиля.
        </p>
        <p>В таком случае Покупатель вправе:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>обменять товар на подходящий;</li>
          <li>либо вернуть товар и получить возврат денежных средств.</li>
        </ul>
        <p>
          При обмене на товар большей стоимости Покупатель доплачивает разницу. При обмене на товар меньшей стоимости
          Продавец возвращает разницу.
        </p>
        <h2 className="text-lg font-semibold text-slate-900">3. Порядок обращения</h2>
        <p>
          Для возврата или обмена необходимо предварительно согласовать обращение с менеджером, после чего передать
          товар и документы, подтверждающие покупку.
        </p>
        <h2 className="text-lg font-semibold text-slate-900">4. Самовывоз и возврат товара</h2>
        <p>
          Самовывоз и передача товара на возврат/обмен осуществляются только в г. Екатеринбурге по адресу, указанному
          в разделе{" "}
          <Link href="/contacts" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            Контакты
          </Link>
          . Иных филиалов и пунктов приема товара у Продавца нет.
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
