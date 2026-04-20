import { absoluteUrl } from "./seo";
import { SITE_BRAND, SITE_URL } from "./site";

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: SITE_BRAND,
    url: SITE_URL,
    image: absoluteUrl("/brand/gm-shop-logo-header.png"),
    logo: absoluteUrl("/brand/gm-shop-logo-header.png"),
    telephone: ["+7 (902) 254-01-11", "+7 (343) 206-15-35"],
    areaServed: "Екатеринбург",
    priceRange: "₽₽",
    currenciesAccepted: "RUB",
    paymentAccepted: "Cash, Credit Card, SBP",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Екатеринбург",
      streetAddress: "ул. Готвальда, 9",
      addressCountry: "RU",
      postalCode: "620100",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 56.850673,
      longitude: 60.568755,
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
    sameAs: [
      "https://yandex.ru/maps/org/gm_drive/1299977455/",
    ],
  } as const;
}

/** WebSite + SearchAction — разметка для строки поиска в выдаче (при поддержке Google). */
export function getWebSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_BRAND,
    url: SITE_URL,
    inLanguage: "ru-RU",
    publisher: { "@type": "Organization", name: SITE_BRAND, url: SITE_URL },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/catalog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
