import Link from "next/link";
import type { Metadata } from "next";
import { products } from "../data/products";

const siteUrl = "https://astramotors.shop";

export const metadata: Metadata = {
  title: "Запчасти Chevrolet в Екатеринбурге — купить оригинал и аналоги",
  description:
    "Подбор запчастей Chevrolet в Екатеринбурге по VIN. Оригинальные детали и качественные аналоги. Доставка и консультация по телефону.",
  alternates: { canonical: "/zapchasti-chevrolet" },
  openGraph: {
    title: "Запчасти Chevrolet в Екатеринбурге — Astra Motors",
    description:
      "Подбор по VIN, оригинал и аналоги запчастей Chevrolet. Екатеринбург.",
    url: `${siteUrl}/zapchasti-chevrolet`,
    type: "article",
  },
};

export default function ChevroletPage() {
  const items = products.filter((p) => p.car.toLowerCase().includes("chevrolet"));
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Каталог", item: siteUrl + "/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Запчасти Chevrolet",
        item: siteUrl + "/zapchasti-chevrolet",
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Как подобрать запчасти Chevrolet по VIN?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Мы сверяем VIN и данные автомобиля, после чего подбираем оригинальные варианты и качественные аналоги с учётом применимости.",
        },
      },
      {
        "@type": "Question",
        name: "Сколько времени занимает ответ по подбору?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Обычно отвечаем оперативно. Если требуется проверка по наличию у поставщиков — уточним сроки после VIN.",
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

      <h1 className="text-2xl font-bold text-sky-900">Запчасти Chevrolet в Екатеринбурге</h1>
      <p className="text-slate-600">
        Подберём запчасти Chevrolet по VIN или по артикулу: оригинал и качественные аналоги.
        Поможем с совместимостью, сроками и стоимостью.
      </p>

      <section className="rounded-xl border border-sky-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Подбор по VIN — оригинал и аналоги
        </h2>
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          <li>Проверяем совместимость по VIN</li>
          <li>Даём варианты оригинала и аналогов</li>
          <li>Подбираем под бюджет и сроки</li>
        </ul>
      </section>

      <section className="rounded-xl border border-sky-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Часто ищут на Chevrolet: что подбираем чаще всего
        </h2>
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
        <h2 className="text-lg font-semibold text-slate-800">Как оформить заказ</h2>
        <p className="text-slate-600">
          Самый быстрый путь —{" "}
          <Link href="/podbor-po-vin" className="text-sky-700 font-medium hover:underline">
            подбор по VIN
          </Link>{" "}
          . Далее вы получаете варианты оригинала и качественного аналога, согласуете сроки и мы организуем поставку.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Примеры позиций для Chevrolet</h2>
        {items.length === 0 ? (
          <p className="text-slate-600">Пока нет примеров — оформите запрос на сайте.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 6).map((p) => (
              <article
                key={p.id}
                className="rounded-xl bg-white shadow-md border border-sky-100 p-4 flex flex-col gap-2"
              >
                <h3 className="font-semibold text-sm line-clamp-2">{p.name}</h3>
                <p className="text-xs text-slate-500">{p.car}</p>
                <p className="text-sm font-bold text-sky-600">
                  {p.price.toLocaleString("ru-RU")} ₽
                </p>
                <Link
                  href={`/product/${p.id}`}
                  className="mt-auto inline-flex justify-center rounded-lg bg-sky-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition shadow-sm"
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
          Напишите заявку на сайте или перейдите{" "}
          <Link href="/how-to-order" className="text-sky-700 font-medium hover:underline">
            «Как заказать»
          </Link>
          . Менеджер уточнит детали и наличие.
        </p>
      </section>
    </div>
  );
}

