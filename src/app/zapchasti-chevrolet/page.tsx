import Link from "next/link";
import type { Metadata } from "next";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { CatalogProductGrid } from "../components/catalog/CatalogProductGrid";
import { CatalogSectionHeading } from "../components/catalog/CatalogSectionHeading";
import { products } from "../data/products";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Запчасти Chevrolet в Екатеринбурге — купить оригинал и аналоги",
  description:
    "Подбор запчастей Chevrolet в Екатеринбурге по артикулу. Оригинальные детали и качественные аналоги. Доставка и консультация по телефону.",
  alternates: { canonical: "/zapchasti-chevrolet" },
  openGraph: {
    title: "Запчасти Chevrolet в Екатеринбурге — GM Shop 66",
    description:
      "Оригинал и аналоги запчастей Chevrolet. Екатеринбург.",
    url: `${SITE_URL}/zapchasti-chevrolet`,
    type: "article",
  },
};

export default function ChevroletPage() {
  const items = products.filter((p) => p.car.toLowerCase().includes("chevrolet"));
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "Каталог", item: SITE_URL + "/catalog" },
      {
        "@type": "ListItem",
        position: 3,
        name: "Запчасти Chevrolet",
        item: SITE_URL + "/zapchasti-chevrolet",
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Как подобрать запчасти Chevrolet?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Мы сверяем артикул и данные автомобиля, после чего подбираем оригинальные варианты и качественные аналоги с учётом применимости.",
        },
      },
      {
        "@type": "Question",
        name: "Сколько времени занимает ответ по подбору?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Обычно отвечаем оперативно. Если требуется проверка по наличию у поставщиков — уточним сроки после согласования заявки.",
        },
      },
      {
        "@type": "Question",
        name: "Есть ли доставка в Екатеринбурге?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Да, доставляем по Екатеринбургу. Условия согласуем после подбора и проверки наличия.",
        },
      },
      {
        "@type": "Question",
        name: "Можно заказать аналог вместо оригинала?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Да. Мы предложим оригинал и качественный аналог, чтобы вы могли выбрать по цене и срокам.",
        },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <CatalogChrome
        crumbs={[
          { label: "Главная", href: "/" },
          { label: "Каталог", href: "/catalog" },
          { label: "Chevrolet" },
        ]}
        title="Запчасти Chevrolet в Екатеринбурге"
        description="Подбор по артикулу: оригинал и аналоги. Совместимость, сроки и стоимость — уточняем по запросу."
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <CatalogSectionHeading>Подбор по артикулу — оригинал и аналоги</CatalogSectionHeading>
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          <li>Проверяем совместимость по артикулу и каталогу</li>
          <li>Даём варианты оригинала и аналогов</li>
          <li>Подбираем под бюджет и сроки</li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <CatalogSectionHeading>Часто ищут на Chevrolet</CatalogSectionHeading>
        <div className="flex flex-wrap gap-2">
          {[
            "тормозные колодки и диски",
            "фильтры",
            "масло и расходники",
            "свечи зажигания",
            "аккумуляторы",
            "системы охлаждения",
          ].map((t) => (
            <span
              key={t}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700"
            >
              {t}
            </span>
          ))}
        </div>
        <p className="text-slate-600">
          Если нужной позиции нет в каталоге — оставьте заявку, подберём и привезём под заказ.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <CatalogSectionHeading>Как оформить заказ</CatalogSectionHeading>
        <p className="text-slate-600">
          Самый быстрый путь —{" "}
          <Link href="/contacts" className="text-amber-700 font-medium hover:underline">
            связаться с менеджером
          </Link>{" "}
          . Далее вы получаете варианты оригинала и качественного аналога, согласуете сроки и мы организуем поставку.
        </p>
      </section>

      <section className="space-y-4">
        <CatalogSectionHeading>Примеры позиций для Chevrolet</CatalogSectionHeading>
        <CatalogProductGrid
          items={items.slice(0, 6)}
          emptyMessage="Пока нет примеров — оформите запрос на сайте."
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <CatalogSectionHeading>Как заказать</CatalogSectionHeading>
        <p className="text-slate-600">
          Напишите заявку на сайте или перейдите{" "}
          <Link href="/how-to-order" className="text-amber-700 font-medium hover:underline">
            «Как заказать»
          </Link>
          . Менеджер уточнит детали и наличие.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <CatalogSectionHeading>Вопросы и ответы</CatalogSectionHeading>
        <div className="space-y-3 text-slate-700">
          <div>
            <p className="font-semibold">Как подобрать Chevrolet?</p>
            <p className="text-slate-600">
              Сверяем артикул и комплектацию, подбираем оригинальные детали и качественные аналоги с учётом применимости.
              Уточним наличие и сроки.
            </p>
          </div>
          <div>
            <p className="font-semibold">Можно ли заказать аналог вместо оригинала?</p>
            <p className="text-slate-600">
              Да. Предложим варианты оригинала и качественных аналогов, чтобы вы выбрали по цене и срокам.
            </p>
          </div>
          <div>
            <p className="font-semibold">Доставляете по Екатеринбургу?</p>
            <p className="text-slate-600">
              Да, доставляем по Екатеринбургу. Условия согласуем после подбора и проверки наличия.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <CatalogSectionHeading>Закажите подбор по Chevrolet</CatalogSectionHeading>
        <p className="text-sm text-slate-600">
          Оставьте артикул или данные автомобиля — подберём оригинальные запчасти Chevrolet и качественные аналоги, уточним
          наличие и сроки.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/contacts"
            className="inline-flex justify-center rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition shadow-sm"
          >
            Связаться с менеджером
          </Link>
          <Link
            href="/how-to-order"
            className="inline-flex justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
          >
            Как заказать
          </Link>
          <Link
            href="/contacts"
            className="inline-flex justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
          >
            Контакты
          </Link>
        </div>
      </section>
    </div>
  );
}

