/** Публичный URL сайта (SEO, canonical, schema, ссылки). */
export const SITE_URL = "https://gmshop66.ru" as const;

/**
 * Название магазина в текстах и SEO (без кода региона в слогане).
 * Визуально на сайте: локап «GM SHOP» + отдельный бейдж {@link SITE_REGION_CODE}.
 */
export const SITE_BRAND = "GM Shop" as const;

/** Код региона — только бейдж рядом с названием, не часть слова «SHOP». */
export const SITE_REGION_CODE = "66" as const;
