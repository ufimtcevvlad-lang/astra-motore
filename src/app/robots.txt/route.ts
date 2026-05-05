import { SITE_URL } from "../lib/site";

export const dynamic = "force-static";

const TECHNICAL_DISALLOW = [
  "/api/",
  "/cart",
  "/account",
  "/admin",
  "/auth/",
  "/favorites",
];

const NON_CANONICAL_CATALOG_PARAMS = [
  "q",
  "sort",
  "page",
  "view",
  "priceFrom",
  "priceTo",
  "inStock",
];

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "yclid",
  "ysclid",
  "yrclid",
  "gclid",
  "fbclid",
  "from",
  "openstat",
];

function robotsBlock(userAgent: string, extraLines: string[] = []) {
  return [
    `User-agent: ${userAgent}`,
    "Allow: /",
    ...TECHNICAL_DISALLOW.map((path) => `Disallow: ${path}`),
    ...extraLines,
  ].join("\n");
}

export function GET() {
  const host = new URL(SITE_URL).host;
  const yandexLines = [
    `Clean-param: ${TRACKING_PARAMS.join("&")}`,
    `Clean-param: ${NON_CANONICAL_CATALOG_PARAMS.join("&")} /catalog`,
  ];

  const body = [
    robotsBlock("Yandex", yandexLines),
    "",
    robotsBlock("*", [
      "Disallow: /*?*sort=",
      "Disallow: /*?*q=",
      "Disallow: /*?*priceFrom=",
      "Disallow: /*?*priceTo=",
      "Disallow: /*?*inStock=",
      "Disallow: /*?*page=",
    ]),
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    `Host: ${host}`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
