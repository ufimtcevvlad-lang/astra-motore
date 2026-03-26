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
          Настоящее Положение определяет условия гарантии на товары, приобретенные в интернет-магазине Astra Motors,
          и порядок рассмотрения гарантийных обращений.
        </p>
        <h2 className="text-lg font-semibold text-slate-900">1. Общие гарантийные условия</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>гарантийный срок исчисляется с даты передачи товара Покупателю;</li>
          <li>если производителем установлен больший срок гарантии, применяется срок производителя;</li>
          <li>товар должен использоваться строго по назначению и в соответствии с требованиями производителя.</li>
        </ul>

        <h2 className="text-lg font-semibold text-slate-900">2. Условие об установке на СТО</h2>
        <p>
          Для большинства технически сложных автозапчастей гарантийные обязательства применяются при установке на
          станции технического обслуживания (СТО/СТОА), осуществляющей деятельность в соответствии с законодательством
          РФ. При необходимости Продавец вправе запросить подтверждающие документы о выполненных работах.
        </p>

        <h2 className="text-lg font-semibold text-slate-900">3. Документы для гарантийного обращения</h2>
        <p>Для рассмотрения обращения Покупателю необходимо предоставить:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>документы, подтверждающие покупку товара;</li>
          <li>сам товар с недостатком;</li>
          <li>документы СТО о выполненных работах и результатах диагностики (если применимо);</li>
          <li>при наличии — акт дефектовки или заключение сервиса.</li>
        </ul>

        <h2 className="text-lg font-semibold text-slate-900">4. Порядок рассмотрения гарантийного случая</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Покупатель направляет обращение через менеджера и передает комплект документов;</li>
          <li>Продавец проводит проверку качества товара;</li>
          <li>при подтверждении гарантийного случая требования удовлетворяются в объеме, предусмотренном законом;</li>
          <li>при необходимости может быть запрошена дополнительная информация.</li>
        </ul>

        <h2 className="text-lg font-semibold text-slate-900">5. Случаи, не подпадающие под гарантию</h2>
        <p>Гарантия, как правило, не распространяется на случаи:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>механических повреждений, ДТП, небрежной эксплуатации;</li>
          <li>нарушения правил монтажа, эксплуатации и обслуживания;</li>
          <li>естественного износа и расходных материалов;</li>
          <li>воздействия внешних агрессивных факторов и природных явлений;</li>
          <li>установки/использования товара с нарушением технических требований производителя.</li>
        </ul>

        <h2 className="text-lg font-semibold text-slate-900">6. Права Покупателя при подтвержденном недостатке</h2>
        <p>
          В соответствии с законодательством РФ Покупатель вправе требовать замену, уменьшение цены, устранение
          недостатков либо возврат денежных средств — в зависимости от характера недостатка и применимых норм права.
        </p>

        <h2 className="text-lg font-semibold text-slate-900">7. География приема гарантийных обращений</h2>
        <p>
          Прием товара по гарантийным обращениям осуществляется только в г. Екатеринбурге по адресу, указанному в
          разделе{" "}
          <Link href="/contacts" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            Контакты
          </Link>
          . Иных филиалов и пунктов приема у Продавца нет.
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
