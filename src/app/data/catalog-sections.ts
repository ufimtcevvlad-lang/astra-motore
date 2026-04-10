/**
 * Разделы каталога: порядок, якоря, подсказки.
 * Поле `category` у товара должно совпадать с `title`.
 *
 * Группы (`CATALOG_GROUPS`) — логика как у «Витрины» на vdopel.ru:
 * крупные блоки → внутри тематические подразделы.
 */
export const CATALOG_GROUPS = [
  {
    slug: "to-rashod",
    title: "ТО и расходники",
    hint: "Регламентное обслуживание: свечи, фильтры",
  },
  {
    slug: "motor",
    title: "Двигатель и смазка",
    hint: "Узлы мотора, масляные каналы",
  },
  {
    slug: "ohlazhdenie",
    title: "Охлаждение",
    hint: "Контур ОЖ, датчики, бачки",
  },
  {
    slug: "uplotneniya",
    title: "Прокладки и уплотнения",
    hint: "Сальники, кольца, прокладки",
  },
  {
    slug: "podveska",
    title: "Подвеска",
    hint: "Рычаги, стабилизатор",
  },
  {
    slug: "elektrika",
    title: "Свет и электрика",
    hint: "Лампы, электрооборудование",
  },
  {
    slug: "kuzov",
    title: "Кузов и крепёж",
    hint: "Клипсы, расходники по кузову",
  },
] as const;

export type CatalogGroupSlug = (typeof CATALOG_GROUPS)[number]["slug"];

export const CATALOG_SECTIONS = [
  {
    slug: "svechi",
    title: "Свечи и зажигание",
    hint: "Bosch, GM OE для моторов Ecotec",
    groupSlug: "to-rashod" satisfies CatalogGroupSlug,
  },
  {
    slug: "filtry",
    title: "Масляные фильтры",
    hint: "Hengst и другие для ТО",
    groupSlug: "to-rashod" satisfies CatalogGroupSlug,
  },
  {
    slug: "filtry-vozdushnye",
    title: "Воздушные фильтры",
    hint: "Воздушная очистка для Ecotec и др.",
    groupSlug: "to-rashod" satisfies CatalogGroupSlug,
  },
  {
    slug: "filtry-salon",
    title: "Салонные фильтры",
    hint: "Фильтры салона",
    groupSlug: "to-rashod" satisfies CatalogGroupSlug,
  },
  {
    slug: "filtry-toplivnye",
    title: "Топливные фильтры",
    hint: "Топливная фильтрация для дизелей и бензина",
    groupSlug: "to-rashod" satisfies CatalogGroupSlug,
  },
  {
    slug: "filtry-akpp",
    title: "Фильтры АКПП",
    hint: "Фильтры автоматической коробки передач",
    groupSlug: "to-rashod" satisfies CatalogGroupSlug,
  },
  {
    slug: "dvigatel",
    title: "Двигатель",
    hint: "Смазка, маслосъёмные колпачки",
    groupSlug: "motor" satisfies CatalogGroupSlug,
  },
  {
    slug: "ohlazhdenie",
    title: "Охлаждение",
    hint: "Датчики, крышки бачка, контур ОЖ",
    groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug,
  },
  {
    slug: "prokladki",
    title: "Прокладки, сальники и кольца",
    hint: "Кольца, прокладки, сальники",
    groupSlug: "uplotneniya" satisfies CatalogGroupSlug,
  },
  {
    slug: "podveska",
    title: "Подвеска",
    hint: "Стабилизатор, рычаги",
    groupSlug: "podveska" satisfies CatalogGroupSlug,
  },
  {
    slug: "tormoza",
    title: "Тормозная система",
    hint: "Колодки и расходники по тормозам",
    groupSlug: "podveska" satisfies CatalogGroupSlug,
  },
  {
    slug: "elektrika",
    title: "Автосвет и электрика",
    hint: "Лампы и расходники",
    groupSlug: "elektrika" satisfies CatalogGroupSlug,
  },
  {
    slug: "kuzov-krepez",
    title: "Кузов и крепёж",
    hint: "Клипсы подкрылков и мелочи",
    groupSlug: "kuzov" satisfies CatalogGroupSlug,
  },
] as const;

export type CatalogSectionTitle = (typeof CATALOG_SECTIONS)[number]["title"];

const TITLES = new Set(CATALOG_SECTIONS.map((s) => s.title));

export function isCatalogSectionTitle(title: string): title is CatalogSectionTitle {
  return TITLES.has(title as CatalogSectionTitle);
}

export function sortProductsById(a: { id: string }, b: { id: string }): number {
  const na = parseInt(/\d+/.exec(a.id)?.[0] ?? "0", 10);
  const nb = parseInt(/\d+/.exec(b.id)?.[0] ?? "0", 10);
  return na - nb;
}

/** Секции внутри группы — в порядке из CATALOG_SECTIONS */
export function sectionsInGroup(groupSlug: CatalogGroupSlug) {
  return CATALOG_SECTIONS.filter((s) => s.groupSlug === groupSlug);
}
