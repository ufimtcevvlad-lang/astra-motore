import Link from "next/link";
import type { Metadata } from "next";
import { products } from "../data/products";

const siteUrl = "https://astramotors.shop";

export const metadata: Metadata = {
  title: "Запчасти Cadillac в Екатеринбурге — купить оригинал и аналоги",
  description:
    "Подбор запчастей Cadillac в Екатеринбурге по VIN. Оригинальные детали и качественные аналоги. Доставка и консультация по телефону.",
  alternates: { canonical: "/zapchasti-cadillac" },
  openGraph: {
    title: "Запчасти Cadillac в Екатеринбурге — Astra Motors",
    description:
      "Подбор по VIN, оригинал и аналоги запчастей Cadillac. Екатеринбург.",
    url: `${siteUrl}/zapchasti-cadillac`,
    type: "article",
  },
};

export default function CadillacPage() {
  const items = products.filter((p) => p.car.toLowerCase().includes("cadillac"));
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Каталог", item: siteUrl + "/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Запчасти Cadillac",
        item: siteUrl + "/zapchasti-cadillac",
      },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Как подобрать запчасти Cadillac по VIN?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Сверяем VIN и комплектацию, подбираем оригинальные детали и качественные аналоги. Уточним наличие и сроки в Екатеринбурге.",
        },
      },
      {
        "@type": "Question",
        name: "Можно ли заказать аналог вместо оригинала?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Да. Предложим варианты оригинала и качественных аналогов, чтобы вы выбрали по цене, срокам и задаче.",
        },
      },
      {
        "@type": "Question",
        name: "Сколько занимает подбор запчастей?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Обычно отвечаем оперативно. Если требуется проверка наличия у поставщиков — уточним сроки после VIN.",
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

      <h1 className="text-2xl font-bold text-rose-900">Запчасти Cadillac в Екатеринбурге</h1>
      <p className="text-slate-600">
        Подберём запчасти Cadillac по VIN или по артикулу: оригинал и качественные аналоги.
        Поможем с совместимостью и организуем поставку.
      </p>

      <section className="rounded-xl border border-rose-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Оригинал и аналоги под ваш запрос</h2>
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          <li>Подбор по VIN и подбор аналогов</li>
          <li>Консультация перед заказом</li>
          <li>Доставка по Екатеринбургу</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Примеры позиций для Cadillac</h2>
        {items.length === 0 ? (
          <p className="text-slate-600">Пока нет примеров — оформите запрос на сайте.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 6).map((p) => (
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
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Как заказать</h2>
        <p className="text-slate-600">
          Нажмите{" "}
          <Link href="/how-to-order" className="text-rose-700 font-medium hover:underline">
            «Как заказать»
          </Link>{" "}
          и отправьте заявку. Менеджер уточнит наличие.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Вопросы и ответы</h2>
        <div className="space-y-3 text-slate-700">
          <div>
            <p className="font-semibold">Как подобрать Cadillac по VIN?</p>
            <p className="text-slate-600">
              Сверяем VIN и комплектацию, подбираем оригинальные детали и качественные аналоги, уточняем
              наличие и сроки.
            </p>
          </div>
          <div>
            <p className="font-semibold">Оригинал или аналог — что выбрать?</p>
            <p className="text-slate-600">
              Мы покажем варианты оригинала и качественных аналогов, чтобы вы выбрали по цене и задаче.
            </p>
          </div>
          <div>
            <p className="font-semibold">Когда отвечаете по заявке?</p>
            <p className="text-slate-600">
              Обычно отвечаем быстро. Если нужна проверка наличия у поставщиков — сроки уточним после VIN.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-rose-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Закажите подбор по Cadillac</h2>
        <p className="text-sm text-slate-600">
          Оставьте VIN или артикул — подберём оригинальные запчасти Cadillac и качественные аналоги, уточним
          наличие и сроки.
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
    </div>
  );
}

