import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Доставка запчастей в Екатеринбурге — GM Shop",
  description:
    "Доставка запчастей GM (Opel, Chevrolet) в Екатеринбурге. Оригинал и качественные аналоги. Уточним сроки и наличие.",
  alternates: { canonical: "/dostavka-zapchastey-ekaterinburg" },
  openGraph: {
    title: "Доставка запчастей в Екатеринбурге",
    description:
      "Доставка, оригинал и аналоги. Екатеринбург.",
    url: `${SITE_URL}/dostavka-zapchastey-ekaterinburg`,
    type: "article",
  },
};

export default function DeliveryPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL + "/" },
      { "@type": "ListItem", position: 2, name: "Каталог", item: SITE_URL + "/catalog" },
      {
        "@type": "ListItem",
        position: 3,
        name: "Доставка",
        item: SITE_URL + "/dostavka-zapchastey-ekaterinburg",
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Доставляете по Екатеринбургу?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Да. Доставку организуем по Екатеринбургу и согласуем условия после подбора и проверки наличия.",
        },
      },
      {
        "@type": "Question",
        name: "Как быстро можно получить заказ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Срок зависит от наличия и поставки. Мы сразу уточним ожидаемые сроки после согласования заказа.",
        },
      },
      {
        "@type": "Question",
        name: "Можно заказать оригинал и аналог?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Да. Предложим оригинальные детали и качественные аналоги, чтобы вы выбрали лучший вариант по цене и срокам.",
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

      <h1 className="text-2xl font-bold text-amber-900">Доставка запчастей в Екатеринбурге</h1>
      <p className="text-slate-600">
        Поможем подобрать запчасти GM (Opel, Chevrolet) по артикулу. Доставим в Екатеринбурге — сроки и наличие
        уточняем после проверки.
      </p>

      <section className="rounded-xl border border-amber-100 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Что вы получаете</h2>
        <ul className="list-disc pl-5 text-slate-700 space-y-1">
          <li>Подбор по артикулу и применимость</li>
          <li>Оригинал и качественные аналоги</li>
          <li>Согласование сроков и стоимости</li>
          <li>Организация доставки по Екатеринбургу</li>
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Начать заявку</h2>
        <p className="text-slate-600">
          Оформите запрос на сайте и менеджер свяжется с вами:{" "}
          <Link href="/contacts" className="text-amber-700 font-medium hover:underline">
            контакты
          </Link>
          .
        </p>
        <p className="text-slate-600">
          Как оформить заказ:{" "}
          <Link href="/how-to-order" className="text-amber-700 font-medium hover:underline">
            «Как заказать»
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

