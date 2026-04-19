import Link from "next/link";
import type { Metadata } from "next";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { CatalogProductGrid } from "../components/catalog/CatalogProductGrid";
import { CatalogSectionHeading } from "../components/catalog/CatalogSectionHeading";
import { getAllProducts } from "../lib/products-db";
import { socialShareMetadata } from "../lib/seo";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Запчасти GM (Opel, Chevrolet) в Екатеринбурге",
  description:
    "Запчасти GM в Екатеринбурге: Opel и Chevrolet. Оригинал и аналоги. Доставка и консультация.",
  alternates: { canonical: "/zapchasti-gm" },
  ...socialShareMetadata({
    title: "Запчасти GM (Opel, Chevrolet) — GM Shop",
    description: "Оригинал и аналоги GM в Екатеринбурге. Каталог и доставка.",
    path: "/zapchasti-gm",
  }),
};

export default function GmPage() {
  const products = getAllProducts();
  const items = products.slice(0, 6);
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "Каталог", item: SITE_URL + "/catalog" },
      {
        "@type": "ListItem",
        position: 3,
        name: "Запчасти GM",
        item: SITE_URL + "/zapchasti-gm",
      },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Как подобрать запчасти GM?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Сверяем артикул и комплектацию, проверяем применимость детали и предлагаем оригинальные варианты и качественные аналоги. Уточним наличие и сроки в Екатеринбурге.",
        },
      },
      {
        "@type": "Question",
        name: "Оригинал или аналог — что выбрать?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Мы покажем варианты оригинальных деталей и качественных аналогов. Вы выбираете по цене и срокам, а менеджер поможет с совместимостью.",
        },
      },
      {
        "@type": "Question",
        name: "Есть ли доставка по Екатеринбургу?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Да. Доставка по Екатеринбургу организуется после проверки наличия и подтверждения заявки.",
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
          { label: "GM" },
        ]}
        title="Запчасти GM (Opel, Chevrolet) в Екатеринбурге"
        description="Подбор по артикулу: оригинал и аналоги. Opel и Chevrolet — ответим и уточним наличие."
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <CatalogSectionHeading>Ключевые направления</CatalogSectionHeading>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/zapchasti-opel"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:border-slate-500 hover:text-slate-900 transition"
          >
            Opel
          </Link>
          <Link
            href="/zapchasti-chevrolet"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:border-slate-500 hover:text-slate-900 transition"
          >
            Chevrolet
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <CatalogSectionHeading>Примеры товаров</CatalogSectionHeading>
        <CatalogProductGrid items={items} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <CatalogSectionHeading>Закажите консультацию</CatalogSectionHeading>
        <p className="text-sm text-slate-600">
          Если нужной позиции нет в каталоге или вы сомневаетесь в совместимости, напишите менеджеру.
          Мы подберём оригинальные запчасти GM и качественные аналоги, уточним наличие и сроки в Екатеринбурге.
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

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <CatalogSectionHeading>Вопросы и ответы</CatalogSectionHeading>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Как подобрать запчасти GM?
            </h3>
            <p className="text-sm text-slate-600">
              Сверяем артикул и комплектацию, проверяем применимость детали и предлагаем оригинальные варианты и качественные аналоги. Уточним наличие и сроки в Екатеринбурге.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Оригинал или аналог — что выбрать?
            </h3>
            <p className="text-sm text-slate-600">
              Мы показываем варианты оригинальных деталей и качественных аналогов. Вы выбираете по цене и срокам, а менеджер помогает с совместимостью.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Есть ли доставка по Екатеринбургу?
            </h3>
            <p className="text-sm text-slate-600">
              Да. Доставка по Екатеринбургу организуется после проверки наличия и подтверждения заявки.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

