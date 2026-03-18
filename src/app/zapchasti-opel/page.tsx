import Link from "next/link";
import type { Metadata } from "next";
import { products } from "../data/products";

const siteUrl = "https://astramotors.shop";

export const metadata: Metadata = {
  title: "Запчасти Opel в Екатеринбурге — купить оригинал и аналоги",
  description:
    "Подбор запчастей Opel в Екатеринбурге по VIN. Оригинальные детали и качественные аналоги. Доставка и консультация по телефону.",
  alternates: { canonical: "/zapchasti-opel" },
  openGraph: {
    title: "Запчасти Opel в Екатеринбурге — Astra Motors",
    description:
      "Подбор по VIN, оригинал и аналоги запчастей Opel. Екатеринбург.",
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
      { "@type": "ListItem", position: 1, name: "Каталог", item: siteUrl + "/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Запчасти Opel",
        item: siteUrl + "/zapchasti-opel",
      },
    ],
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <h1 className="text-2xl font-bold text-sky-900">Запчасти Opel в Екатеринбурге</h1>
      <p className="text-slate-600">
        Подберём запчасти Opel по VIN или по артикулу: оригинал и качественные аналоги.
        Дадим срок и ориентировочную стоимость, поможем подобрать совместимость.
      </p>

      <section className="rounded-xl border border-sky-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">
          Подбор по VIN — быстро и без ошибок
        </h2>
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          <li>Сверяем совместимость по VIN и комплектации</li>
          <li>Предлагаем оригинальные детали и аналоги</li>
          <li>Организуем доставку по Екатеринбургу</li>
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
          Оставьте заявку на сайте или нажмите{" "}
          <Link href="/how-to-order" className="text-sky-700 font-medium hover:underline">
            «Как заказать»
          </Link>
          . Менеджер свяжется с вами и уточнит детали.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Вопросы и ответы</h2>
        <div className="space-y-3 text-slate-700">
          <div>
            <p className="font-semibold">Можете подобрать по VIN?</p>
            <p className="text-slate-600">
              Да, достаточно VIN или данных автомобиля — подберём подходящую деталь и аналоги.
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
    </div>
  );
}

