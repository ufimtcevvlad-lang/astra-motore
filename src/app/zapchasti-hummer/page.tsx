import Link from "next/link";
import type { Metadata } from "next";
import { products } from "../data/products";

const siteUrl = "https://astramotors.shop";

export const metadata: Metadata = {
  title: "Запчасти Hummer в Екатеринбурге — купить оригинал и аналоги",
  description:
    "Подбор запчастей Hummer в Екатеринбурге по VIN. Оригинальные детали и качественные аналоги. Доставка и консультация по телефону.",
  alternates: { canonical: "/zapchasti-hummer" },
  openGraph: {
    title: "Запчасти Hummer в Екатеринбурге — Astra Motors",
    description:
      "Подбор по VIN, оригинал и аналоги запчастей Hummer. Екатеринбург.",
    url: `${siteUrl}/zapchasti-hummer`,
    type: "article",
  },
};

export default function HummerPage() {
  const items = products.filter((p) => p.car.toLowerCase().includes("hummer"));
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Каталог", item: siteUrl + "/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Запчасти Hummer",
        item: siteUrl + "/zapchasti-hummer",
      },
    ],
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <h1 className="text-2xl font-bold text-sky-900">Запчасти Hummer в Екатеринбурге</h1>
      <p className="text-slate-600">
        Подберём запчасти Hummer по VIN или по артикулу: оригинал и качественные аналоги.
        Поможем подобрать совместимость и организуем поставку.
      </p>

      <section className="rounded-xl border border-sky-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Подбор по VIN и поставка под заказ</h2>
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          <li>Подбор совместимых деталей</li>
          <li>Оригинал и качественные аналоги</li>
          <li>Оперативная связь с менеджером</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Примеры позиций для Hummer</h2>
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
          Перейдите{" "}
          <Link href="/how-to-order" className="text-sky-700 font-medium hover:underline">
            «Как заказать»
          </Link>{" "}
          и отправьте заявку. Менеджер уточнит детали и наличие.
        </p>
      </section>
    </div>
  );
}

