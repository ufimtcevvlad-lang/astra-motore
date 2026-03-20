import Link from "next/link";
import type { Metadata } from "next";
import { products } from "../data/products";

const siteUrl = "https://astramotors.shop";

export const metadata: Metadata = {
  title: "Запчасти GM (Opel, Chevrolet) в Екатеринбурге — подбор по VIN",
  description:
    "Запчасти GM в Екатеринбурге: Opel, Chevrolet, Cadillac, Hummer. Подбор по VIN, оригинал и аналоги. Доставка и консультация.",
  alternates: { canonical: "/zapchasti-gm" },
};

export default function GmPage() {
  const items = products.slice(0, 6);
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Каталог", item: siteUrl + "/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Запчасти GM",
        item: siteUrl + "/zapchasti-gm",
      },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Как подобрать запчасти GM по VIN?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Сверяем VIN и комплектацию, проверяем применимость детали и предлагаем оригинальные варианты и качественные аналоги. Уточним наличие и сроки в Екатеринбурге.",
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

      <h1 className="text-2xl font-bold text-rose-900">
        Запчасти GM (Opel, Chevrolet) в Екатеринбурге
      </h1>
      <p className="text-slate-600">
        Подберём запчасти GM по VIN или артикулу: оригинальные детали и качественные аналоги.
        Работаем с Opel, Chevrolet, Cadillac и Hummer. Быстро ответим, уточним наличие и сроки.
      </p>

      <section className="rounded-xl border border-rose-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Ключевые направления</h2>
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
          <Link
            href="/zapchasti-cadillac"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:border-slate-500 hover:text-slate-900 transition"
          >
            Cadillac
          </Link>
          <Link
            href="/zapchasti-hummer"
            className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:border-slate-500 hover:text-slate-900 transition"
          >
            Hummer
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Примеры товаров</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <article
              key={p.id}
              className="rounded-xl bg-white shadow-md border border-rose-100 p-4 flex flex-col gap-2"
            >
              <h3 className="font-semibold text-sm line-clamp-2">{p.name}</h3>
              <p className="text-xs text-slate-500">{p.car}</p>
              <p className="text-sm font-bold text-rose-600">
                {p.price.toLocaleString("ru-RU")} ₽
              </p>
              <Link
                href={`/product/${p.id}`}
                className="mt-auto inline-flex justify-center rounded-lg bg-rose-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-rose-700 transition shadow-sm"
              >
                Подробнее
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-rose-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Закажите подбор по VIN</h2>
        <p className="text-sm text-slate-600">
          Если нужной позиции нет в каталоге или вы сомневаетесь в совместимости, отправьте VIN.
          Мы подберём оригинальные запчасти GM и качественные аналоги, уточним наличие и сроки в Екатеринбурге.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/podbor-po-vin"
            className="inline-flex justify-center rounded-lg bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition shadow-sm"
          >
            Подбор по VIN
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
        <h2 className="text-lg font-semibold text-slate-900">Вопросы и ответы</h2>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              Как подобрать запчасти GM по VIN?
            </h3>
            <p className="text-sm text-slate-600">
              Сверяем VIN и комплектацию, проверяем применимость детали и предлагаем оригинальные варианты и качественные аналоги. Уточним наличие и сроки в Екатеринбурге.
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

