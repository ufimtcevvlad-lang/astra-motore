import type { Metadata } from "next";
import Link from "next/link";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { SimpleDoc } from "../components/legal/SimpleDoc";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "О компании GM Shop 66",
  description:
    "GM Shop 66 — магазин автозапчастей для Opel и Chevrolet в Екатеринбурге. Подбор по VIN, оригинальные детали и качественные аналоги, помощь с выбором и заказом.",
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
      <SimpleDoc title="GM Shop 66">
        <p>
          <strong>GM Shop 66</strong> — специализированный магазин автозапчастей для автомобилей Opel и Chevrolet в
          Екатеринбурге. Мы помогаем быстро и точно подобрать детали для регулярного обслуживания и ремонта: от
          расходников до узлов ходовой части, двигателя, системы охлаждения, тормозной системы и электрики.
        </p>
        <p>
          Основной фокус компании — практичный подбор запчастей под конкретный автомобиль и задачу клиента. В работе
          используем данные производителя, артикулы, идентификационный номер автомобиля и технические параметры авто,
          чтобы снизить риск ошибки при покупке.
        </p>
        <h2 className="text-lg font-semibold text-slate-900">Что вы получаете в GM Shop 66</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>подбор автозапчастей Opel и Chevrolet по идентификационному номеру автомобиля и артикулу;</li>
          <li>оригинальные детали и проверенные аналоги в разных ценовых сегментах;</li>
          <li>понятные консультации по совместимости и применимости деталей;</li>
          <li>актуальные цены и сопровождение заказа до выдачи;</li>
          <li>прозрачные условия возврата, гарантии и обработки обращений.</li>
        </ul>
        <h2 className="text-lg font-semibold text-slate-900">Подбор запчастей в Екатеринбурге</h2>
        <p>
          Мы работаем с клиентами из Екатеринбурга и Свердловской области, где особенно востребован оперативный подбор
          запчастей для Opel Astra, Opel Corsa, Opel Zafira, Chevrolet Cruze, Chevrolet Aveo и других моделей концерна
          General Motors. Если нужной позиции нет в каталоге, мы проверим доступные варианты и предложим оптимальное
          решение по сроку поставки и бюджету.
        </p>
        <p>
          Наша цель — чтобы вы получали совместимые детали без лишних переплат и повторных заказов. Поэтому мы
          рекомендуем перед покупкой уточнять данные автомобиля и сверять артикулы вместе с менеджером.
        </p>
        <h2 className="text-lg font-semibold text-slate-900">Как оформить запрос</h2>
        <p>
          Вы можете выбрать товары через{" "}
          <Link href="/catalog" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            каталог
          </Link>
          , отправить{" "}
          <Link href="/vin-request" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            запрос по VIN
          </Link>{" "}
          или обратиться через{" "}
          <Link href="/contacts" className="font-medium text-amber-800 underline-offset-2 hover:underline">
            раздел контактов
          </Link>
          . Мы поможем подобрать запчасти и подскажем оптимальный вариант покупки под ваш автомобиль.
        </p>
      </SimpleDoc>
    </div>
  );
}
