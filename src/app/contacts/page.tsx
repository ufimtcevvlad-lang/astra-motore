import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Контакты",
  description:
    "Контакты Astra Motors: телефон, адрес и режим работы. Подбор запчастей для VAG и GM по VIN, заказ и консультация.",
  alternates: { canonical: "/contacts" },
};

export default function ContactsPage() {
  const siteUrl = "https://astramotors.shop";
  const contactPointLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    mainEntity: {
      "@type": "Organization",
      name: "Astra Motors",
      url: siteUrl,
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
      <h1 className="text-2xl font-bold text-sky-900">Контакты</h1>
      <p className="text-slate-600">Свяжитесь с <span className="font-semibold text-sky-700">Astra Motors</span> — ответим и подберём запчасти.</p>

      <div className="rounded-xl border border-sky-100 bg-white p-6 shadow-sm space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Телефон</p>
          <p className="text-lg">
            <a
              href="tel:+79022540111"
              className="text-sky-600 font-medium hover:text-sky-700 hover:underline"
            >
              +7 (902) 254-01-11
            </a>
            <br />
            <a
              href="tel:+73432061535"
              className="text-sky-600 font-medium hover:text-sky-700 hover:underline"
            >
              +7 (343) 206-15-35
            </a>
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Адрес</p>
          <p className="text-slate-800">
            г. Екатеринбург, ул. Готвальда, д. 9
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
    </div>
  );
}
