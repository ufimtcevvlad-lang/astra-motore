import Link from "next/link";
import type { Metadata } from "next";
import { products } from "../data/products";

const siteUrl = "https://astramotors.shop";

export const metadata: Metadata = {
  title: "Подбор запчастей по VIN в Екатеринбурге — Astra Motors",
  description:
    "Подберём запчасти GM (Opel, Chevrolet, Cadillac, Hummer) по VIN в Екатеринбурге. Оригинальные детали и качественные аналоги. Ответим быстро.",
  alternates: { canonical: "/podbor-po-vin" },
  openGraph: {
    title: "Подбор запчастей по VIN — Astra Motors",
    description:
      "Подбор запчастей GM по VIN: оригинал и аналоги. Екатеринбург.",
    url: `${siteUrl}/podbor-po-vin`,
    type: "article",
  },
};

export default function PodborVinPage() {
  const examples = products.slice(0, 6);
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Каталог", item: siteUrl + "/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Подбор по VIN",
        item: siteUrl + "/podbor-po-vin",
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Как вы подбираете запчасти по VIN?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Сверяем VIN и данные автомобиля, определяем применимость детали и подбираем оригинальные варианты и качественные аналоги.",
        },
      },
      {
        "@type": "Question",
        name: "Сколько времени занимает подбор?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Обычно ответ предоставляем быстро. Если нужна проверка по наличию у поставщиков — уточним сроки после VIN.",
        },
      },
      {
        "@type": "Question",
        name: "Можно заказать аналог вместо оригинала?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Да. Мы предложим оригинал и качественный аналог, чтобы вы могли выбрать по бюджету и срокам.",
        },
      },
      {
        "@type": "Question",
        name: "Вы работаете по Екатеринбургу?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Да. Доставка и согласование условий выполняются с учётом локации в Екатеринбурге и области.",
        },
      },
      {
        "@type": "Question",
        name: "Что нужно, чтобы начать подбор?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Достаточно VIN или данных автомобиля (марка, модель, год). Если есть артикул — подойдёт и он.",
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

      <h1 className="text-2xl font-bold text-sky-900">Подбор запчастей по VIN в Екатеринбурге</h1>
      <p className="text-slate-600">
        Подберём запчасти GM в Екатеринбурге: Opel, Chevrolet, Cadillac и Hummer. Оригинальные детали и качественные аналоги —
        ответим по VIN и уточним совместимость, наличие и сроки.
      </p>

      <section className="rounded-xl border border-sky-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Как проходит подбор</h2>
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          <li>Вы отправляете VIN или данные автомобиля</li>
          <li>Мы проверяем применимость детали</li>
          <li>Предлагаем оригинал и качественный аналог</li>
          <li>Согласуем наличие, сроки и удобный способ получения</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Примеры позиций</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {examples.map((p) => (
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
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Готовы подобрать? Начните с заявки</h2>
        <p className="text-slate-600">
          Посмотрите, как оформить заказ:{" "}
          <Link href="/how-to-order" className="text-sky-700 font-medium hover:underline">
            «Как заказать»
          </Link>
          . Если есть вопросы —{" "}
          <Link href="/contacts" className="text-sky-700 font-medium hover:underline">
            Контакты
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

