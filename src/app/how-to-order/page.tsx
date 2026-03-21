import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Как заказать",
  description:
    "Как заказать запчасти в Astra Motors: выбор товара, оформление корзины, подтверждение менеджером. Оригинал и аналоги.",
  alternates: { canonical: "/how-to-order" },
};

export default function HowToOrderPage() {
  const siteUrl = "https://astramotors.shop";
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl + "/" },
      { "@type": "ListItem", position: 2, name: "Каталог", item: siteUrl + "/catalog" },
      { "@type": "ListItem", position: 3, name: "Как заказать", item: siteUrl + "/how-to-order" },
    ],
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <h1 className="text-2xl font-bold text-amber-900">Как заказать в Astra Motors</h1>
      <p className="text-slate-600">Несколько простых шагов — и заказ у вас.</p>

      <div className="rounded-xl border border-amber-100 bg-white p-6 shadow-sm space-y-6">
        <section>
          <h2 className="text-lg font-medium text-slate-800 mb-2">1. Выберите товар</h2>
          <p className="text-sm text-slate-600">
            Посмотрите каталог на главной странице, откройте карточку товара и нажмите «В корзину».
            Можно добавить несколько позиций и оформить один заказ.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-slate-800 mb-2">2. Оформите заказ</h2>
          <p className="text-sm text-slate-600">
            Перейдите в корзину, проверьте состав заказа и нажмите «Оформить заказ».
            Укажите имя, телефон и при необходимости комментарий (марка авто, удобное время для звонка).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-slate-800 mb-2">3. Подтверждение</h2>
          <p className="text-sm text-slate-600">
            Менеджер свяжется с вами по телефону в течение рабочего дня, уточнит наличие,
            подберёт аналоги при необходимости и согласует способ получения заказа.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-slate-800 mb-2">Оплата и получение</h2>
          <p className="text-sm text-slate-600">
            Оплата при получении (наличными или картой) или по счёту для юр. лиц.
            Самовывоз со склада или доставка по городу — условия уточняйте у менеджера.
          </p>
        </section>

        <p className="text-sm text-slate-600 pt-2">
          <Link
            href="/contacts"
            className="text-amber-600 hover:text-amber-700 hover:underline font-medium"
          >
            Контакты
          </Link>
          {" "}— адрес, телефон и режим работы.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
        <Link
          href="/catalog"
          className="inline-flex justify-center rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition shadow-sm"
        >
          Перейти в каталог
        </Link>
        <Link
          href="/contacts"
          className="inline-flex justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
        >
          Обсудить заказ с менеджером
        </Link>
      </div>
    </div>
  );
}
