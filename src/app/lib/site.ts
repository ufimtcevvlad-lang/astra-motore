/** Публичный URL сайта (SEO, canonical, schema, ссылки). */
export const SITE_URL = "https://gmshop66.ru" as const;

/**
 * Название магазина в текстах и SEO. Пишем везде одинаково: «GM Shop 66».
 * Визуально логотип в шапке использует отдельный локап с бейджем региона.
 */
export const SITE_BRAND = "GM Shop 66" as const;

/** Код региона — только бейдж рядом с названием, не часть слова «SHOP». */
export const SITE_REGION_CODE = "66" as const;
