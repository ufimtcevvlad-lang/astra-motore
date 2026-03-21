/**
 * Разделы каталога: порядок на странице, якоря, подсказки.
 * Поле `category` у товара должно совпадать с `title`.
 */
export const CATALOG_SECTIONS = [
  {
    slug: "svechi",
    title: "Свечи и зажигание",
    hint: "Bosch, GM OE для моторов Ecotec",
  },
  {
    slug: "filtry",
    title: "Масляные фильтры",
    hint: "Hengst и другие для ТО",
  },
  {
    slug: "ohlazhdenie",
    title: "Охлаждение",
    hint: "Датчики, крышки бачка, контур ОЖ",
  },
  {
    slug: "dvigatel",
    title: "Двигатель",
    hint: "Смазка, маслосъёмные колпачки",
  },
  {
    slug: "prokladki",
    title: "Прокладки, сальники и кольца",
    hint: "Кольца, прокладки, сальники",
  },
  {
    slug: "podveska",
    title: "Подвеска",
    hint: "Стабилизатор, рычаги",
  },
  {
    slug: "elektrika",
    title: "Автосвет и электрика",
    hint: "Лампы и расходники",
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
