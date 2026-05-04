export const YANDEX_BUSINESS = {
  orgId: "1299977455",
  slug: "gm_drive",
  displayName: "GM Shop 66",
  addressLine: "г. Екатеринбург, ул. Готвальда, д. 9",
  streetAddress: "ул. Готвальда, 9",
  locality: "Екатеринбург",
  postalCode: "620034",
  lat: 56.850673,
  lon: 60.568755,
  phones: ["+7 (902) 254-01-11", "+7 (343) 206-15-35"],
  phoneLinks: ["tel:+79022540111", "tel:+73432061535"],
  openingHoursText: ["Пн-Пт: 10:00-20:00", "Сб-Вс: 10:00-18:00"],
} as const;

export const YANDEX_BUSINESS_LINKS = {
  profile: `https://yandex.ru/profile/${YANDEX_BUSINESS.orgId}?lang=ru`,
  maps: `https://yandex.ru/maps/org/${YANDEX_BUSINESS.slug}/${YANDEX_BUSINESS.orgId}/`,
  reviews: `https://yandex.ru/maps/org/${YANDEX_BUSINESS.slug}/${YANDEX_BUSINESS.orgId}/reviews/`,
  route: `https://yandex.ru/maps/?rtext=~${YANDEX_BUSINESS.lat},${YANDEX_BUSINESS.lon}&rtt=auto&z=17`,
  mapWidget: `https://yandex.ru/map-widget/v1/org/${YANDEX_BUSINESS.slug}/${YANDEX_BUSINESS.orgId}`,
  reviewsWidget: `https://yandex.ru/maps-reviews-widget/${YANDEX_BUSINESS.orgId}?comments`,
} as const;
