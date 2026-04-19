/**
 * Разделы каталога: порядок, якоря, подсказки.
 * Поле `category` у товара должно совпадать с `title`.
 *
 * Группы (`CATALOG_GROUPS`) — логика как у «Витрины» на vdopel.ru:
 * крупные блоки → внутри тематические подразделы.
 */
export const CATALOG_GROUPS = [
  { slug: "to-rashod",     title: "ТО и расходники",        hint: "Фильтры, свечи, щётки, лампы" },
  { slug: "remni",         title: "Ремни и натяжители",      hint: "Поликлиновые, приводные, ролики" },
  { slug: "tormoza",       title: "Тормозная система",       hint: "Колодки, диски, суппорты" },
  { slug: "podveska",      title: "Подвеска и рулевое",      hint: "Амортизаторы, сайлентблоки, ШРУС" },
  { slug: "ohlazhdenie",   title: "Система охлаждения",      hint: "Радиаторы, помпы, термостаты" },
  { slug: "zazhiganie",    title: "Система зажигания",       hint: "Катушки, модули, провода" },
  { slug: "dvigatel",      title: "Двигатель и уплотнения",  hint: "Прокладки, сальники, поршневая" },
  { slug: "elektrika",     title: "Электрика и датчики",     hint: "Датчики, генераторы, АКБ" },
  { slug: "vyhlop-kuzov",  title: "Выхлоп и кузов",          hint: "Глушители, бамперы, молдинги" },
  { slug: "instrument",    title: "Инструмент",              hint: "Головки, биты, ключи" },
  { slug: "konditsioner",  title: "Кондиционер",             hint: "Компрессоры, клапаны" },
  { slug: "krepezh",       title: "Крепёж",                  hint: "Болты, гайки, клипсы" },
  { slug: "omyvatel",      title: "Омыватель",               hint: "Насосы, форсунки, бачки" },
] as const;

export type CatalogGroupSlug = (typeof CATALOG_GROUPS)[number]["slug"];

export const CATALOG_SECTIONS = [
  // ТО и расходники
  { slug: "filtry-vozdushnye",   title: "Воздушные фильтры",         hint: "Для моторов Ecotec и других",       groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "filtry-salon",        title: "Салонные фильтры",          hint: "Фильтры салона",                     groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "filtry-maslyanye",    title: "Масляные фильтры",          hint: "Hengst, Mann и другие",              groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "filtry-toplivnye",    title: "Топливные фильтры",         hint: "Для бензина и дизеля",               groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "filtry-akpp",         title: "Фильтры АКПП",              hint: "Сменные фильтры автомата",           groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "svechi",              title: "Свечи зажигания",           hint: "Bosch, NGK, GM OE",                  groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "shchetki",            title: "Щётки стеклоочистителя",    hint: "Каркасные и бескаркасные",           groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "lampy",               title: "Лампы",                     hint: "Фары, габариты, салон",              groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  // Ремни
  { slug: "remni-poliklinovye",  title: "Поликлиновые ремни",        hint: "Привод навесного оборудования",      groupSlug: "remni" satisfies CatalogGroupSlug },
  { slug: "remni-generator",     title: "Ремни генератора",          hint: "",                                   groupSlug: "remni" satisfies CatalogGroupSlug },
  { slug: "natyazhiteli",        title: "Ролики и натяжители",       hint: "Натяжные и обводные",                groupSlug: "remni" satisfies CatalogGroupSlug },
  // Тормоза
  { slug: "tormoznye-kolodki",   title: "Тормозные колодки",         hint: "Передние, задние, барабанные",       groupSlug: "tormoza" satisfies CatalogGroupSlug },
  { slug: "tormoznye-diski",     title: "Тормозные диски",           hint: "Вентилируемые и сплошные",           groupSlug: "tormoza" satisfies CatalogGroupSlug },
  { slug: "tormoznye-shlangi",   title: "Тормозные шланги",          hint: "",                                   groupSlug: "tormoza" satisfies CatalogGroupSlug },
  { slug: "supporty",            title: "Суппорты и ремкомплекты",   hint: "Поршни, направляющие",               groupSlug: "tormoza" satisfies CatalogGroupSlug },
  { slug: "tros-ruchnika",       title: "Трос ручника",              hint: "",                                   groupSlug: "tormoza" satisfies CatalogGroupSlug },
  // Подвеска
  { slug: "amortizatory",        title: "Амортизаторы",              hint: "Передние, задние",                   groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "stabilizator",        title: "Стабилизатор",              hint: "Тяги, втулки",                       groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "sharovye",            title: "Шаровые опоры",             hint: "",                                   groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "rulevye",             title: "Рулевые тяги и наконечники", hint: "",                                  groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "rychagi",             title: "Рычаги",                    hint: "Передние, задние",                   groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "sailentbloki",        title: "Сайлентблоки",              hint: "",                                   groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "pruzhiny",            title: "Пружины",                   hint: "Передние, задние",                   groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "pylniki",             title: "Пыльники",                  hint: "ШРУС, рулевые, амортизаторов",       groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "stupitsy",            title: "Ступицы и подшипники",      hint: "",                                   groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "shrus",               title: "ШРУС",                      hint: "Наружные и внутренние",              groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "opora-dvig",          title: "Опоры двигателя",           hint: "Подушки ДВС и КПП",                  groupSlug: "podveska" satisfies CatalogGroupSlug },
  // Охлаждение
  { slug: "radiatory",           title: "Радиаторы",                 hint: "Охлаждения и отопителя",             groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug },
  { slug: "pompy",               title: "Помпы",                     hint: "Водяные насосы",                     groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug },
  { slug: "termostaty",          title: "Термостаты",                hint: "С корпусом и без",                   groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug },
  { slug: "bachki",              title: "Бачки расширительные",      hint: "",                                   groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug },
  { slug: "patrubki",            title: "Патрубки и шланги",         hint: "Радиатора, отопителя, тройники",     groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug },
  { slug: "otopitel",            title: "Мотор отопителя",           hint: "Вентилятор и резистор",              groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug },
  // Зажигание
  { slug: "katushki",            title: "Катушки зажигания",         hint: "",                                   groupSlug: "zazhiganie" satisfies CatalogGroupSlug },
  { slug: "moduli-zazhiganiya",  title: "Модули зажигания",          hint: "",                                   groupSlug: "zazhiganie" satisfies CatalogGroupSlug },
  { slug: "provoda-vv",          title: "Высоковольтные провода",     hint: "",                                   groupSlug: "zazhiganie" satisfies CatalogGroupSlug },
  // Двигатель
  { slug: "prokladki",           title: "Прокладки ДВС",             hint: "Клапанной, впуск/выпуск, поддон",    groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "uplot-kolca",         title: "Уплотнительные кольца",     hint: "",                                   groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "salniki",             title: "Сальники",                  hint: "Коленвала, распредвала, привода",    groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "porshnevaya",         title: "Поршневая группа",          hint: "Поршни, вкладыши, цепи ГРМ",         groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "sceplenie",           title: "Сцепление",                 hint: "Диски, корзины, выжимные",           groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "cilindr-scep",        title: "Цилиндры сцепления",        hint: "Главные и рабочие",                  groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "nasos-topl",          title: "Насосы топливные",          hint: "",                                   groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "klapany",             title: "Клапаны ДВС",               hint: "Впускные и выпускные",               groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "mahoviki",            title: "Маховики",                  hint: "Одно- и двухмассовые",               groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  // Электрика
  { slug: "datchiki",            title: "Датчики",                   hint: "Давления, положения, температуры",   groupSlug: "elektrika" satisfies CatalogGroupSlug },
  { slug: "generator",           title: "Генераторы и стартеры",     hint: "",                                   groupSlug: "elektrika" satisfies CatalogGroupSlug },
  { slug: "akkumulyatory",       title: "Аккумуляторы",              hint: "",                                   groupSlug: "elektrika" satisfies CatalogGroupSlug },
  { slug: "chip-tuning",         title: "Тюнинг и прошивки",         hint: "",                                   groupSlug: "elektrika" satisfies CatalogGroupSlug },
  { slug: "predohraniteli",      title: "Предохранители",            hint: "",                                   groupSlug: "elektrika" satisfies CatalogGroupSlug },
  // Выхлоп и кузов
  { slug: "glushiteli",          title: "Глушители и гофры",         hint: "",                                   groupSlug: "vyhlop-kuzov" satisfies CatalogGroupSlug },
  { slug: "bampery",             title: "Бамперы и накладки",        hint: "",                                   groupSlug: "vyhlop-kuzov" satisfies CatalogGroupSlug },
  { slug: "podkrylki",           title: "Подкрылки",                 hint: "",                                   groupSlug: "vyhlop-kuzov" satisfies CatalogGroupSlug },
  { slug: "zerkala",             title: "Стёкла зеркал",             hint: "",                                   groupSlug: "vyhlop-kuzov" satisfies CatalogGroupSlug },
  { slug: "reshetki",            title: "Решётки и молдинги",        hint: "",                                   groupSlug: "vyhlop-kuzov" satisfies CatalogGroupSlug },
  // Инструмент
  { slug: "golovki-bity",        title: "Головки и биты",            hint: "",                                   groupSlug: "instrument" satisfies CatalogGroupSlug },
  { slug: "klyuchi",             title: "Ключи",                     hint: "",                                   groupSlug: "instrument" satisfies CatalogGroupSlug },
  { slug: "vstavki-rezbovye",    title: "Вставки резьбовые",         hint: "",                                   groupSlug: "instrument" satisfies CatalogGroupSlug },
  // Кондиционер
  { slug: "kompressory-ac",      title: "Компрессоры кондиционера",  hint: "",                                   groupSlug: "konditsioner" satisfies CatalogGroupSlug },
  { slug: "klapany-ac",          title: "Клапаны и фитинги A/C",     hint: "",                                   groupSlug: "konditsioner" satisfies CatalogGroupSlug },
  // Крепёж
  { slug: "bolty",               title: "Болты",                     hint: "",                                   groupSlug: "krepezh" satisfies CatalogGroupSlug },
  { slug: "gaiki",               title: "Гайки",                     hint: "",                                   groupSlug: "krepezh" satisfies CatalogGroupSlug },
  { slug: "klipsy-pistony",      title: "Клипсы и пистоны",          hint: "",                                   groupSlug: "krepezh" satisfies CatalogGroupSlug },
  // Омыватель
  { slug: "nasosy-omyvatelya",   title: "Насосы стеклоомывателя",    hint: "",                                   groupSlug: "omyvatel" satisfies CatalogGroupSlug },
  { slug: "forsunki-omyvatelya", title: "Форсунки омывателя",        hint: "",                                   groupSlug: "omyvatel" satisfies CatalogGroupSlug },
  { slug: "bachki-omyvatelya",   title: "Бачки омывателя",           hint: "",                                   groupSlug: "omyvatel" satisfies CatalogGroupSlug },
  // Общие секции-совпадающие-с-группой (для товаров, не разложенных по подразделам)
  { slug: "dvigatel",            title: "Двигатель и уплотнения",    hint: "Всё по двигателю",                   groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "ohlazhdenie",         title: "Система охлаждения",        hint: "Радиаторы, помпы, термостаты",       groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug },
  { slug: "podveska",            title: "Подвеска и рулевое",        hint: "Амортизаторы, рычаги, ШРУС",         groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "elektrika",           title: "Электрика и датчики",       hint: "Датчики, свет, проводка",            groupSlug: "elektrika" satisfies CatalogGroupSlug },
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

const SECTION_SLUGS = new Set(CATALOG_SECTIONS.map((s) => s.slug));
export function assertValidSectionSlug(slug: string): asserts slug is (typeof CATALOG_SECTIONS)[number]["slug"] {
  if (!SECTION_SLUGS.has(slug as never)) {
    throw new Error(`Unknown catalog section slug: ${slug}`);
  }
}
