import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL } from "../lib/site";

/** Адрес для карты (как на странице) */
const ADDRESS_LINE = "г. Екатеринбург, ул. Готвальда, д. 9";
/** Центр и метка на Яндекс.Картах: долгота, широта (район ул. Готвальда, 9) */
const MAP_LON = 60.5675;
const MAP_LAT = 56.8503;
const MAP_ZOOM = 17;

const YANDEX_MAP_EMBED_SRC = `https://yandex.ru/map-widget/v1/?ll=${MAP_LON}%2C${MAP_LAT}&z=${MAP_ZOOM}&pt=${MAP_LON}%2C${MAP_LAT}%2Cpm2rdm&l=map`;

const YANDEX_MAP_OPEN_HREF = `https://yandex.ru/maps/?text=${encodeURIComponent(
  "Екатеринбург, ул. Готвальда, 9"
)}`;

export const metadata: Metadata = {
  title: "Контакты",
  description:
    "Контакты Astra Motors: телефон, адрес и режим работы. Запчасти GM (Opel, Chevrolet), заказ и консультация.",
  alternates: { canonical: "/contacts" },
};

export default function ContactsPage() {
  const contactPointLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    mainEntity: {
      "@type": "Organization",
      name: "Astra Motors",
      url: SITE_URL,
      telephone: ["+7 (902) 254-01-11", "+7 (343) 206-15-35"],
      contactPoint: [
        {
          "@type": "ContactPoint",
          telephone: "+7 (902) 254-01-11",
          contactType: "sales",
          areaServed: "RU",
          availableLanguage: ["ru"],
        },
        {
          "@type": "ContactPoint",
          telephone: "+7 (343) 206-15-35",
          contactType: "sales",
          areaServed: "RU",
          availableLanguage: ["ru"],
        },
      ],
      address: {
        "@type": "PostalAddress",
        addressLocality: "Екатеринбург",
        streetAddress: "ул. Готвальда, 9",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: MAP_LAT,
        longitude: MAP_LON,
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          opens: "10:00",
          closes: "20:00",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Saturday", "Sunday"],
          opens: "10:00",
          closes: "18:00",
        },
      ],
    },
  };

  return (
    <div className="space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPointLd) }}
      />
      <h1 className="text-2xl font-bold text-amber-900">Контакты</h1>
      <p className="text-slate-600">Свяжитесь с <span className="font-semibold text-amber-700">Astra Motors</span> — ответим и подберём запчасти.</p>

      <div className="rounded-xl border border-amber-100 bg-white p-6 shadow-sm space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Телефон</p>
          <p className="text-lg">
            <a
              href="tel:+79022540111"
              className="text-amber-600 font-medium hover:text-amber-700 hover:underline"
            >
              +7 (902) 254-01-11
            </a>
            <br />
            <a
              href="tel:+73432061535"
              className="text-amber-600 font-medium hover:text-amber-700 hover:underline"
            >
              +7 (343) 206-15-35
            </a>
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Адрес</p>
          <p className="text-slate-800">{ADDRESS_LINE}</p>
          <p className="mt-2">
            <a
              href={YANDEX_MAP_OPEN_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline"
            >
              Открыть на Яндекс.Картах
            </a>
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Режим работы</p>
          <p className="text-slate-800">
            Пн – Пт: 10:00 – 20:00<br />
            Сб – Вс: 10:00 – 18:00
          </p>
        </div>
        <p className="text-sm text-slate-600 pt-2">
          Оставьте заявку на сайте или позвоните — подберём запчасти и уточним наличие.
        </p>
      </div>

      <div className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-amber-900">Как нас найти</h2>
        <p className="mt-1 text-sm text-slate-600">
          Точку на карте можно уточнить по ссылке «Открыть на Яндекс.Картах» выше.
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          <iframe
            title="Astra Motors на Яндекс.Картах"
            src={YANDEX_MAP_EMBED_SRC}
            className="aspect-[16/10] min-h-[220px] w-full border-0 sm:min-h-[280px] sm:aspect-[16/9]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href="tel:+79022540111"
          className="inline-flex justify-center rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition shadow-sm"
        >
          Позвонить
        </a>
        <Link
          href="/how-to-order"
          className="inline-flex justify-center rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 transition"
        >
          Как заказать
        </Link>
      </div>
    </div>
  );
}
