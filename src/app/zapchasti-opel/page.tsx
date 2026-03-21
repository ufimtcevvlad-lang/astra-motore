import Link from "next/link";
import type { Metadata } from "next";
import { products } from "../data/products";

const siteUrl = "https://astramotors.shop";

export const metadata: Metadata = {
  title: "Запчасти Opel в Екатеринбурге — купить оригинал и аналоги",
  description:
    "Подбор запчастей Opel в Екатеринбурге по артикулу. Оригинальные детали и качественные аналоги. Доставка и консультация по телефону.",
  alternates: { canonical: "/zapchasti-opel" },
  openGraph: {
    title: "Запчасти Opel в Екатеринбурге — Astra Motors",
    description:
      "Оригинал и аналоги запчастей Opel. Екатеринбург.",
    url: `${siteUrl}/zapchasti-opel`,
    type: "article",
  },
};

export default function OpelPage() {
  const items = products.filter((p) => p.car.toLowerCase().includes("opel"));
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl + "/" },
      { "@type": "ListItem", position: 2, name: "Каталог", item: siteUrl + "/catalog" },
      {
        "@type": "ListItem",
        position: 3,
        name: "Запчасти Opel",
        item: siteUrl + "/zapchasti-opel",
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Как вы подбираете запчасти Opel?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Сверяем артикул и комплектацию, определяем применимость детали и предлагаем оригинальные варианты и качественные аналоги.",
        },
      },
      {
        "@type": "Question",
        name: "Оригинал или аналог — что выбрать?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Мы покажем варианты оригинала и качественных аналогов, а вы выбираете по бюджету и срокам. При необходимости уточним нюансы совместимости.",
        },
      },
      {
        "@type": "Question",
        name: "Есть ли доставка в Екатеринбурге?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Да. Доставку организуем по Екатеринбургу и согласуем сроки после проверки наличия.",
        },
      },
      {
        "@type": "Question",
        name: "Можно ли заказать, если нужной позиции нет в каталоге?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Да. Если позиции нет в каталоге, оформите запрос — подберём и привезём под заказ.",
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

      <h1 className="text-2xl font-bold text-amber-900">Запчасти Opel в Екатеринбурге</h1>
      <p className="text-slate-600">
        Подберём запчасти Opel по артикулу и каталогу: оригинал и качественные аналоги.
        Дадим срок и ориентировочную стоимость, поможем подобрать совместимость.
      </p>

      <section className="rounded-xl border border-amber-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Подбор по артикулу — быстро и без ошибок
        </h2>
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          <li>Сверяем совместимость по артикулу и комплектации</li>
          <li>Предлагаем оригинальные детали и аналоги</li>
          <li>Организуем доставку по Екатеринбургу</li>
        </ul>
      </section>

      <section className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Какие категории запчастей Opel подбираем
        </h2>
        <p className="text-slate-600">
          Подбор по артикулу для популярных систем автомобиля:
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            "тормозная система",
            "фильтры",
            "свечи",
            "аккумуляторы",
            "радиаторы",
            "тормозная жидкость",
            "расходники",
          ].map((t) => (
            <span
              key={t}
              className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Оригинал vs качественный аналог
        </h2>
        <p className="text-slate-600">
          Мы не “впариваем” один вариант. Предоставляем сравнение: оригинальные детали и качественные аналоги,
          чтобы вы выбрали по цене, срокам и задачам.
        </p>
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          <li>Помогаем подобрать совместимость</li>
          <li>Объясняем различия по характеристикам</li>
          <li>Подсказываем лучший вариант под ваш бюджет</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Примеры позиций для Opel</h2>
        {items.length === 0 ? (
          <p className="text-slate-600">Пока нет примеров — но вы можете оформить запрос.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.slice(0, 6).map((p) => (
              <article
                key={p.id}
                className="rounded-xl bg-white shadow-md border border-amber-100 p-4 flex flex-col gap-2"
              >
                <h3 className="font-semibold text-sm line-clamp-2">{p.name}</h3>
                <p className="text-xs text-slate-500">{p.car}</p>
                <p className="text-sm font-bold text-amber-600">
                  {p.price.toLocaleString("ru-RU")} ₽
                </p>
                <Link
                  href={`/product/${p.id}`}
                  className="mt-auto inline-flex justify-center rounded-lg bg-amber-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition shadow-sm"
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
          Оставьте заявку на сайте или нажмите{" "}
          <Link href="/how-to-order" className="text-amber-700 font-medium hover:underline">
            «Как заказать»
          </Link>
          . Менеджер свяжется с вами и уточнит детали.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Вопросы и ответы</h2>
        <div className="space-y-3 text-slate-700">
          <div>
            <p className="font-semibold">Можете подобрать по артикулу?</p>
            <p className="text-slate-600">
              Да, достаточно артикула или данных автомобиля — подберём подходящую деталь и аналоги.
            </p>
          </div>
          <div>
            <p className="font-semibold">Есть ли доставка в Екатеринбурге?</p>
            <p className="text-slate-600">
              Да, организуем доставку по городу. Срок зависит от наличия и поставки.
            </p>
          </div>
          <div>
            <p className="font-semibold">Оригинал или аналог — что выбрать?</p>
            <p className="text-slate-600">
              Предложим оригинальные детали и качественные аналоги, чтобы вы выбрали по бюджету.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-amber-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Закажите подбор по Opel</h2>
        <p className="text-sm text-slate-600">
          Оставьте артикул или данные автомобиля — подберём оригинальные детали и качественные аналоги, уточним
          наличие и сроки в Екатеринбурге.
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

