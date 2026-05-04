import { absoluteUrl } from "./seo";
import { SITE_BRAND, SITE_URL } from "./site";
import { YANDEX_BUSINESS, YANDEX_BUSINESS_LINKS } from "./yandex-business";

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: SITE_BRAND,
    url: SITE_URL,
    image: absoluteUrl("/brand/gm-shop-logo-header.png"),
    logo: absoluteUrl("/brand/gm-shop-logo-header.png"),
    telephone: YANDEX_BUSINESS.phones,
    areaServed: YANDEX_BUSINESS.locality,
    priceRange: "₽₽",
    currenciesAccepted: "RUB",
    paymentAccepted: "Cash, Credit Card, SBP",
    address: {
      "@type": "PostalAddress",
      addressLocality: YANDEX_BUSINESS.locality,
      streetAddress: YANDEX_BUSINESS.streetAddress,
      addressCountry: "RU",
      postalCode: YANDEX_BUSINESS.postalCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: YANDEX_BUSINESS.lat,
      longitude: YANDEX_BUSINESS.lon,
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
      YANDEX_BUSINESS_LINKS.maps,
      YANDEX_BUSINESS_LINKS.profile,
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
