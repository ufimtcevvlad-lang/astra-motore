# Каталог 13 групп + пост-обработка импорта — план реализации

> **Спек:** [docs/superpowers/specs/2026-04-19-catalog-and-import-design.md](../specs/2026-04-19-catalog-and-import-design.md)

**Goal:** Расширить каталог до 13 групп / ~50 разделов и добавить пост-обработку импорта из 1С: подстановку марки авто, дописывание артикула, автокатегоризацию и фильтр не-GM/химии.

**Architecture:** Справочники данных (TS-модули в `src/app/data/`) + чистая логика (`src/app/lib/import/`) + расширение существующих import-роутов и админского UI.

**Tech Stack:** Next.js App Router, Drizzle ORM (SQLite), React, TypeScript. Проверки: `npm run typecheck`, `npm run lint`, превью в браузере. Отдельный TDD-фреймворк не вводим — вместо этого ad-hoc валидационные скрипты через `tsx`.

---

## File Structure

Новые файлы:
- `src/app/data/non-gm-markers.ts` — токены не-GM марок для фильтра
- `src/app/data/chemistry-markers.ts` — токены жидкостей/химии для фильтра
- `src/app/data/category-rules.ts` — правила ключевых слов → sectionSlug
- `src/app/lib/import/normalize-name.ts` — нормализация дефисов и опечаток 1С
- `src/app/lib/import/detect-car.ts` — определение марки и моделей по имени
- `src/app/lib/import/rewrite-name.ts` — вставка марки + добавление `| арт. {sku}`
- `src/app/lib/import/classify.ts` — фильтр не-GM/химии (причина отбраковки или null)
- `src/app/lib/import/detect-category.ts` — ключевые слова → sectionSlug
- `scripts/validate-import-rules.ts` — ad-hoc прогон логики по реальному Excel
- `src/app/admin/(app)/products/_components/BulkCategoryModal.tsx` — модалка для batch

Модифицируемые:
- `src/app/data/catalog-sections.ts` — расширение до 13 групп / ~50 разделов
- `src/app/api/admin/products/import/route.ts` — трёхведёрный ответ
- `src/app/api/admin/products/import/confirm/route.ts` — принимать редактированные поля
- `src/app/admin/components/ExcelImport.tsx` — 3 секции + редактируемые строки
- `src/app/lib/product-description-gen.ts` — расширение шаблонов
- `src/app/admin/(app)/products/page.tsx` — фильтр «Без категории» + batch-действия

---

## Task 1 — расширить CATALOG_SECTIONS до 13 групп

**Files:** Modify `src/app/data/catalog-sections.ts`

- [ ] **Step 1:** Переписать `CATALOG_GROUPS` — 13 групп (slug, title, hint) по спеку раздел 2.2:

```ts
export const CATALOG_GROUPS = [
  { slug: "to-rashod",     title: "ТО и расходники",        hint: "Фильтры, свечи, щётки, лампы" },
  { slug: "remni",         title: "Ремни и натяжители",     hint: "Поликлиновые, приводные, ролики" },
  { slug: "tormoza",       title: "Тормозная система",      hint: "Колодки, диски, суппорты" },
  { slug: "podveska",      title: "Подвеска и рулевое",     hint: "Амортизаторы, сайлентблоки, ШРУС" },
  { slug: "ohlazhdenie",   title: "Система охлаждения",     hint: "Радиаторы, помпы, термостаты" },
  { slug: "zazhiganie",    title: "Система зажигания",      hint: "Катушки, модули, провода" },
  { slug: "dvigatel",      title: "Двигатель и уплотнения", hint: "Прокладки, сальники, поршневая" },
  { slug: "elektrika",     title: "Электрика и датчики",    hint: "Датчики, генераторы, АКБ" },
  { slug: "vyhlop-kuzov",  title: "Выхлоп и кузов",         hint: "Глушители, бамперы, молдинги" },
  { slug: "instrument",    title: "Инструмент",             hint: "Головки, биты, ключи" },
  { slug: "konditsioner",  title: "Кондиционер",            hint: "Компрессоры, клапаны" },
  { slug: "krepezh",       title: "Крепёж",                 hint: "Болты, гайки, клипсы" },
  { slug: "omyvatel",      title: "Омыватель",              hint: "Насосы, форсунки, бачки" },
] as const;
```

- [ ] **Step 2:** Переписать `CATALOG_SECTIONS` — ~50 разделов. Каждая запись: `{ slug, title, hint, groupSlug }`. Список из спека раздел 2.2, по каждой группе:

```ts
export const CATALOG_SECTIONS = [
  // ТО и расходники
  { slug: "filtry-vozdushnye", title: "Воздушные фильтры",    hint: "Для моторов Ecotec и других",     groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "filtry-salon",      title: "Салонные фильтры",     hint: "Фильтры салона",                   groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "filtry-maslyanye",  title: "Масляные фильтры",     hint: "Hengst, Mann и другие",            groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "filtry-toplivnye",  title: "Топливные фильтры",    hint: "Для бензина и дизеля",             groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "filtry-akpp",       title: "Фильтры АКПП",         hint: "Сменные фильтры автомата",         groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "svechi",            title: "Свечи зажигания",      hint: "Bosch, NGK, GM OE",                groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "shchetki",          title: "Щётки стеклоочистителя", hint: "Каркасные и бескаркасные",       groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  { slug: "lampy",             title: "Лампы",                hint: "Фары, габариты, салон",            groupSlug: "to-rashod" satisfies CatalogGroupSlug },
  // Ремни
  { slug: "remni-poliklinovye", title: "Поликлиновые ремни",  hint: "Привод навесного оборудования",    groupSlug: "remni" satisfies CatalogGroupSlug },
  { slug: "remni-generator",    title: "Ремни генератора",     hint: "",                                groupSlug: "remni" satisfies CatalogGroupSlug },
  { slug: "natyazhiteli",       title: "Ролики и натяжители",  hint: "Натяжные и обводные",             groupSlug: "remni" satisfies CatalogGroupSlug },
  // Тормоза
  { slug: "tormoznye-kolodki",  title: "Тормозные колодки",    hint: "Передние, задние, барабанные",    groupSlug: "tormoza" satisfies CatalogGroupSlug },
  { slug: "tormoznye-diski",    title: "Тормозные диски",      hint: "Вентилируемые и сплошные",        groupSlug: "tormoza" satisfies CatalogGroupSlug },
  { slug: "tormoznye-shlangi",  title: "Тормозные шланги",     hint: "",                                groupSlug: "tormoza" satisfies CatalogGroupSlug },
  { slug: "supporty",           title: "Суппорты и ремкомплекты", hint: "Поршни, направляющие",         groupSlug: "tormoza" satisfies CatalogGroupSlug },
  { slug: "tros-ruchnika",      title: "Трос ручника",         hint: "",                                groupSlug: "tormoza" satisfies CatalogGroupSlug },
  // Подвеска
  { slug: "amortizatory",       title: "Амортизаторы",         hint: "Передние, задние",                groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "stabilizator",       title: "Стабилизатор",         hint: "Тяги, втулки",                    groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "sharovye",           title: "Шаровые опоры",        hint: "",                                groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "rulevye",            title: "Рулевые тяги и наконечники", hint: "",                          groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "rychagi",            title: "Рычаги",               hint: "Передние, задние",                groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "sailentbloki",       title: "Сайлентблоки",         hint: "",                                groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "pruzhiny",           title: "Пружины",              hint: "Передние, задние",                groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "pylniki",            title: "Пыльники",             hint: "ШРУС, рулевые, амортизаторов",    groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "stupitsy",           title: "Ступицы и подшипники", hint: "",                                groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "shrus",              title: "ШРУС",                 hint: "Наружные и внутренние",           groupSlug: "podveska" satisfies CatalogGroupSlug },
  { slug: "opora-dvig",         title: "Опоры двигателя",      hint: "Подушки ДВС и КПП",               groupSlug: "podveska" satisfies CatalogGroupSlug },
  // Охлаждение
  { slug: "radiatory",          title: "Радиаторы",            hint: "Охлаждения и отопителя",          groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug },
  { slug: "pompy",              title: "Помпы",                hint: "Водяные насосы",                  groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug },
  { slug: "termostaty",         title: "Термостаты",           hint: "С корпусом и без",                groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug },
  { slug: "bachki",             title: "Бачки расширительные", hint: "",                                groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug },
  { slug: "patrubki",           title: "Патрубки и шланги",    hint: "Радиатора, отопителя, тройники",  groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug },
  { slug: "otopitel",           title: "Мотор отопителя",      hint: "Вентилятор и резистор",           groupSlug: "ohlazhdenie" satisfies CatalogGroupSlug },
  // Зажигание
  { slug: "katushki",           title: "Катушки зажигания",    hint: "",                                groupSlug: "zazhiganie" satisfies CatalogGroupSlug },
  { slug: "moduli-zazhiganiya", title: "Модули зажигания",     hint: "",                                groupSlug: "zazhiganie" satisfies CatalogGroupSlug },
  { slug: "provoda-vv",         title: "Высоковольтные провода", hint: "",                              groupSlug: "zazhiganie" satisfies CatalogGroupSlug },
  // Двигатель
  { slug: "prokladki",          title: "Прокладки ДВС",        hint: "Клапанной, впуск/выпуск, поддон", groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "uplot-kolca",        title: "Уплотнительные кольца", hint: "",                               groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "salniki",            title: "Сальники",             hint: "Коленвала, распредвала, привода", groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "porshnevaya",        title: "Поршневая группа",     hint: "Поршни, вкладыши, цепи ГРМ",      groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "sceplenie",          title: "Сцепление",            hint: "Диски, корзины, выжимные",        groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "cilindr-scep",       title: "Цилиндры сцепления",   hint: "Главные и рабочие",               groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "nasos-topl",         title: "Насосы топливные",     hint: "",                                groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "klapany",            title: "Клапаны ДВС",          hint: "Впускные и выпускные",            groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  { slug: "mahoviki",           title: "Маховики",             hint: "Одно- и двухмассовые",            groupSlug: "dvigatel" satisfies CatalogGroupSlug },
  // Электрика
  { slug: "datchiki",           title: "Датчики",              hint: "Давления, положения, температуры", groupSlug: "elektrika" satisfies CatalogGroupSlug },
  { slug: "generator",          title: "Генераторы и стартеры", hint: "",                                groupSlug: "elektrika" satisfies CatalogGroupSlug },
  { slug: "akkumulyatory",      title: "Аккумуляторы",         hint: "",                                groupSlug: "elektrika" satisfies CatalogGroupSlug },
  { slug: "chip-tuning",        title: "Тюнинг и прошивки",    hint: "",                                groupSlug: "elektrika" satisfies CatalogGroupSlug },
  { slug: "predohraniteli",     title: "Предохранители",       hint: "",                                groupSlug: "elektrika" satisfies CatalogGroupSlug },
  // Выхлоп и кузов
  { slug: "glushiteli",         title: "Глушители и гофры",    hint: "",                                groupSlug: "vyhlop-kuzov" satisfies CatalogGroupSlug },
  { slug: "bampery",            title: "Бамперы и накладки",   hint: "",                                groupSlug: "vyhlop-kuzov" satisfies CatalogGroupSlug },
  { slug: "podkrylki",          title: "Подкрылки",            hint: "",                                groupSlug: "vyhlop-kuzov" satisfies CatalogGroupSlug },
  { slug: "zerkala",            title: "Стёкла зеркал",        hint: "",                                groupSlug: "vyhlop-kuzov" satisfies CatalogGroupSlug },
  { slug: "reshetki",           title: "Решётки и молдинги",   hint: "",                                groupSlug: "vyhlop-kuzov" satisfies CatalogGroupSlug },
  // Инструмент
  { slug: "golovki-bity",       title: "Головки и биты",       hint: "",                                groupSlug: "instrument" satisfies CatalogGroupSlug },
  { slug: "klyuchi",            title: "Ключи",                hint: "",                                groupSlug: "instrument" satisfies CatalogGroupSlug },
  { slug: "vstavki-rezbovye",   title: "Вставки резьбовые",    hint: "",                                groupSlug: "instrument" satisfies CatalogGroupSlug },
  // Кондиционер
  { slug: "kompressory-ac",     title: "Компрессоры кондиционера", hint: "",                            groupSlug: "konditsioner" satisfies CatalogGroupSlug },
  { slug: "klapany-ac",         title: "Клапаны и фитинги A/C", hint: "",                               groupSlug: "konditsioner" satisfies CatalogGroupSlug },
  // Крепёж
  { slug: "bolty",              title: "Болты",                hint: "",                                groupSlug: "krepezh" satisfies CatalogGroupSlug },
  { slug: "gaiki",              title: "Гайки",                hint: "",                                groupSlug: "krepezh" satisfies CatalogGroupSlug },
  { slug: "klipsy-pistony",     title: "Клипсы и пистоны",     hint: "",                                groupSlug: "krepezh" satisfies CatalogGroupSlug },
  // Омыватель
  { slug: "nasosy-omyvatelya",  title: "Насосы стеклоомывателя", hint: "",                              groupSlug: "omyvatel" satisfies CatalogGroupSlug },
  { slug: "forsunki-omyvatelya", title: "Форсунки омывателя",  hint: "",                                groupSlug: "omyvatel" satisfies CatalogGroupSlug },
  { slug: "bachki-omyvatelya",  title: "Бачки омывателя",      hint: "",                                groupSlug: "omyvatel" satisfies CatalogGroupSlug },
] as const;
```

- [ ] **Step 3:** Запустить `npm run typecheck`. Ожидается: если есть старые ссылки на удалённые slug/group — вылезут ошибки. Исправить точечно (в файлах из списка импортов, замена старых slug на новые эквиваленты).

- [ ] **Step 4:** Запустить `npm run lint`. Починить.

- [ ] **Step 5:** Commit:
```
git add src/app/data/catalog-sections.ts
git commit -m "feat(catalog): расширение до 13 групп и ~50 разделов"
```

---

## Task 2 — справочники фильтров (non-GM + chemistry)

**Files:** Create `src/app/data/non-gm-markers.ts`, `src/app/data/chemistry-markers.ts`

- [ ] **Step 1:** `non-gm-markers.ts`:

```ts
// Токены марок/моделей не-GM, которые нельзя продавать на сайте GM-магазина.
// Проверка case-insensitive по границам слов.
export const NON_GM_MARKERS = [
  "hyundai", "kia", "toyota", "lexus", "nissan", "infiniti",
  "renault", "mercedes", "bmw", "mini", "ford", "audi",
  "skoda", "seat", "volkswagen", "vw", "vag", "porsche",
  "mazda", "subaru", "honda", "mitsubishi", "peugeot",
  "citroen", "citroën", "dacia", "suzuki", "volvo", "fiat",
  "jeep", "chrysler", "lada", "ваз", "uaz", "уаз", "niva",
  "нива", "priora", "vesta", "xray", "largus", "granta",
  "kalina",
  // VAG-движки
  "tsi", "tfsi", "tdi", "fsi",
  // Частые Ford/Land Rover/VW в прайсе
  "focus", "c-max", "tiguan", "touareg",
  "discovery", "freelander", "disco", "rrs",
  "haval", "jolion",
  // Сокращения Skoda
  "fab", "oct", "rap", "sup", "yet",
] as const;
```

- [ ] **Step 2:** `chemistry-markers.ts`:

```ts
// Ключи для отбраковки жидкостей/химии.
// Магазин не работает с позициями под «Честным знаком».
export const CHEMISTRY_MARKERS = [
  "масло", "масла", "жидкость", "жидкости", "антифриз",
  "dot4", "dot 4", "dexos", "5w-", "5w ", "10w-", "15w-",
  "75w", "80w", "api sn", "api cf",
  "шампунь", "грунт", "полироль", "очиститель", "смазка",
  "восстановленн", "восстановл", "восст.", "баллон восстан",
  // Бренды химии
  "castrol", "shell", "lukoil", "chempioil", "vitex",
  "coolstream", "лавр", "lavr",
] as const;
```

- [ ] **Step 3:** `npm run typecheck` + `npm run lint`.

- [ ] **Step 4:** Commit:
```
git add src/app/data/non-gm-markers.ts src/app/data/chemistry-markers.ts
git commit -m "feat(import): справочники не-GM и химии для фильтра импорта"
```

---

## Task 3 — справочник правил категоризации

**Files:** Create `src/app/data/category-rules.ts`

- [ ] **Step 1:** Создать файл. Правила в порядке от специфичных к общим (первое совпадение побеждает):

```ts
// Правила: если normalized name содержит ключ, присваиваем sectionSlug.
// Проверяется lower-case name.
// Порядок важен: специфичные раньше общих.
export interface CategoryRule {
  sectionSlug: string;
  keywords: string[];
}

export const CATEGORY_RULES: CategoryRule[] = [
  // === Тормозная ===
  { sectionSlug: "tormoznye-kolodki", keywords: ["колодки тормозн", "колодка тормозн", "колодки ручн", "колодки стоян"] },
  { sectionSlug: "tormoznye-diski",   keywords: ["диск тормозн"] },
  { sectionSlug: "tormoznye-shlangi", keywords: ["шланг тормозн"] },
  { sectionSlug: "supporty",          keywords: ["суппорт торм", "ремкомплект суппорт", "поршень суппорт", "направляющ суппорт"] },
  { sectionSlug: "tros-ruchnika",     keywords: ["трос ручн", "трос стояноч"] },

  // === Фильтры ===
  { sectionSlug: "filtry-akpp",       keywords: ["фильтр акпп", "фильтр авт.кор", "фильтр автоматич"] },
  { sectionSlug: "filtry-vozdushnye", keywords: ["фильтр воздушн"] },
  { sectionSlug: "filtry-maslyanye",  keywords: ["фильтр масл"] },
  { sectionSlug: "filtry-salon",      keywords: ["фильтр салон"] },
  { sectionSlug: "filtry-toplivnye",  keywords: ["фильтр топливн"] },

  // === ТО прочее ===
  { sectionSlug: "svechi",            keywords: ["свеча зажиг", "свечи зажиг"] },
  { sectionSlug: "shchetki",          keywords: ["щётк", "щетк"] },
  { sectionSlug: "lampy",             keywords: ["лампа ", "лампы ", "лампа фары"] },

  // === Зажигание ===
  { sectionSlug: "katushki",          keywords: ["катушк зажиг", "катушки зажиг", "наконечник на кат"] },
  { sectionSlug: "moduli-zazhiganiya",keywords: ["модуль зажиг", "модули зажиг"] },
  { sectionSlug: "provoda-vv",        keywords: ["провода высоковольт", "провод высоковольт", "провода в-в", "провод в-в"] },

  // === Ремни и ролики ===
  { sectionSlug: "remni-poliklinovye",keywords: ["ремень поликлинов", "поликлиновый ремень"] },
  { sectionSlug: "remni-generator",   keywords: ["ремень генератор"] },
  { sectionSlug: "natyazhiteli",      keywords: ["натяжитель ремн", "ролик натяж", "ролик обводн", "ролик приводн", "натяжитель приводн"] },

  // === Подвеска ===
  { sectionSlug: "amortizatory",      keywords: ["амортизатор", "стойка аморт", "стойки аморт"] },
  { sectionSlug: "stabilizator",      keywords: ["стабилизатор", "втулка стаб", "тяга стаб"] },
  { sectionSlug: "sharovye",          keywords: ["опора шаров", "шаровая опор", "шаров опор"] },
  { sectionSlug: "rulevye",           keywords: ["наконечник рулев", "тяга рулев", "рейка рулев", "рулев тяг"] },
  { sectionSlug: "rychagi",           keywords: ["рычаг"] },
  { sectionSlug: "sailentbloki",      keywords: ["сайлентблок"] },
  { sectionSlug: "pruzhiny",          keywords: ["пружин"] },
  { sectionSlug: "pylniki",           keywords: ["пыльник", "пыльники"] },
  { sectionSlug: "stupitsy",          keywords: ["ступиц", "подшипник ступ", "подшипник передн колес", "подшипник задн колес", "подшипник стой"] },
  { sectionSlug: "shrus",             keywords: ["шрус", "шарнир равн", "привод в сбор"] },
  { sectionSlug: "opora-dvig",        keywords: ["опора двиг", "опора коробк", "подушка двиг", "подушка кпп"] },

  // === Охлаждение ===
  { sectionSlug: "radiatory",         keywords: ["радиатор охлажд", "радиатор отопит", "радиатор "] },
  { sectionSlug: "pompy",             keywords: ["помпа", "насос водян"] },
  { sectionSlug: "termostaty",        keywords: ["термостат"] },
  { sectionSlug: "bachki",            keywords: ["бачок расширит", "крышка расширит", "крышка бачка охлажд"] },
  { sectionSlug: "patrubki",          keywords: ["патрубок", "шланг радиат", "шланг отопит", "шланг охлажд", "тройник", "выпускной шланг"] },
  { sectionSlug: "otopitel",          keywords: ["мотор отопит", "вентилятор отопит", "резистор отопит"] },

  // === Двигатель ===
  { sectionSlug: "porshnevaya",       keywords: ["поршн", "вкладыш", "цепь грм", "цепь газорасп", "звёздочка грм", "звездочка грм", "кольца поршн"] },
  { sectionSlug: "sceplenie",         keywords: ["сцеплен", "диск сцеп", "корзина сцеп", "выжимн"] },
  { sectionSlug: "cilindr-scep",      keywords: ["цилиндр сцеп", "главный цилиндр", "рабочий цилиндр"] },
  { sectionSlug: "nasos-topl",        keywords: ["насос топливн", "топливный насос"] },
  { sectionSlug: "klapany",           keywords: ["клапан впуск", "клапан выпуск", "клапан вентил", "впускной клапан", "выпускной клапан"] },
  { sectionSlug: "mahoviki",          keywords: ["маховик"] },
  { sectionSlug: "prokladki",         keywords: ["прокладка", "прокладки"] },
  { sectionSlug: "salniki",           keywords: ["сальник"] },
  { sectionSlug: "uplot-kolca",       keywords: ["кольцо уплот", "кольца уплот", "кольцо резинов", "кольцо ", "кольца "] },

  // === Электрика ===
  { sectionSlug: "chip-tuning",       keywords: ["чип-тюн", "чип тюн", "прошивк", "блок управления двиг"] },
  { sectionSlug: "predohraniteli",    keywords: ["предохранитель"] },
  { sectionSlug: "akkumulyatory",     keywords: ["аккумулят"] },
  { sectionSlug: "generator",         keywords: ["генератор ", "стартер "] },
  { sectionSlug: "datchiki",          keywords: ["датчик"] },

  // === Кондиционер ===
  { sectionSlug: "kompressory-ac",    keywords: ["компрессор кондиц", "компрессор конд", "ремкомплект компрессор", "компрессор"] },
  { sectionSlug: "klapany-ac",        keywords: ["клапан кондиц", "фитинг кондиц", "расширительный клапан"] },

  // === Выхлоп и кузов ===
  { sectionSlug: "glushiteli",        keywords: ["глушитель", "гофра глуш", "катализатор", "труба приемн", "приёмная труба", "прокладка приемн", "прокладка приёмн"] },
  { sectionSlug: "bampery",           keywords: ["бампер", "накладка бампер", "кронштейн бампер", "направляющая бампер"] },
  { sectionSlug: "podkrylki",         keywords: ["подкрылок", "брызговик"] },
  { sectionSlug: "zerkala",           keywords: ["стекло зеркал", "зеркало "] },
  { sectionSlug: "reshetki",          keywords: ["решётк", "решетк", "молдинг", "эмблем"] },

  // === Крепёж ===
  { sectionSlug: "klipsy-pistony",    keywords: ["клипса", "пистон "] },
  { sectionSlug: "gaiki",             keywords: ["гайка", "гайки"] },
  { sectionSlug: "bolty",             keywords: ["болт ", "болты "] },

  // === Омыватель ===
  { sectionSlug: "nasosy-omyvatelya", keywords: ["насос стеклоомыват", "насос омыват"] },
  { sectionSlug: "forsunki-omyvatelya", keywords: ["форсунка омыват", "форсунки омыват"] },
  { sectionSlug: "bachki-omyvatelya", keywords: ["бачок омыват"] },

  // === Инструмент ===
  { sectionSlug: "golovki-bity",      keywords: ["головка торц", "головка ударн", "головка-бит", "бита ", "биты ", "вставка (бита)"] },
  { sectionSlug: "vstavki-rezbovye",  keywords: ["вставка резьб"] },
  { sectionSlug: "klyuchi",           keywords: ["ключ "] },
];
```

- [ ] **Step 2:** Добавить в `catalog-sections.ts` helper, валидирующий что каждый `sectionSlug` из правил реально существует (на старте приложения):

В самый низ `src/app/data/catalog-sections.ts` дописать:
```ts
const SECTION_SLUGS = new Set(CATALOG_SECTIONS.map((s) => s.slug));
export function assertValidSectionSlug(slug: string): void {
  if (!SECTION_SLUGS.has(slug)) {
    throw new Error(`Unknown catalog section slug: ${slug}`);
  }
}
```

- [ ] **Step 3:** `npm run typecheck`, `npm run lint`.

- [ ] **Step 4:** Commit:
```
git add src/app/data/category-rules.ts src/app/data/catalog-sections.ts
git commit -m "feat(import): правила автокатегоризации по ключевым словам"
```

---

## Task 4 — нормализация имени из 1С

**Files:** Create `src/app/lib/import/normalize-name.ts`

- [ ] **Step 1:** Создать файл:

```ts
import { CAR_MODELS, TYPO_FIXES } from "../../data/car-models";

/**
 * Нормализация: исправление опечаток 1С + замена дефиса на пробел в моделях.
 * Возвращает новое name.
 */
export function normalizeName(raw: string): string {
  let s = raw;

  // Применяем опечатки из справочника.
  for (const [from, to] of Object.entries(TYPO_FIXES)) {
    s = s.replaceAll(from, to);
  }

  // Для каждой модели: если встречается вариант с дефисом, заменяем на без дефиса.
  for (const model of CAR_MODELS) {
    for (const alias of model.aliases) {
      if (alias.includes("-")) {
        const noDash = alias.replace("-", " ");
        s = s.replaceAll(alias, noDash);
      }
    }
  }

  // Сжимаем лишние пробелы.
  s = s.replace(/\s+/g, " ").trim();

  return s;
}
```

- [ ] **Step 2:** `npm run typecheck`.

- [ ] **Step 3:** Commit:
```
git add src/app/lib/import/normalize-name.ts
git commit -m "feat(import): нормализация имени (опечатки + дефисы)"
```

---

## Task 5 — определение марки и моделей по имени

**Files:** Create `src/app/lib/import/detect-car.ts`

- [ ] **Step 1:** Создать файл:

```ts
import { CAR_MODELS, MAKE_TOKENS_IN_NAME, type CarMake } from "../../data/car-models";

export interface DetectedCar {
  /** Уникальные марки, найденные по моделям. */
  makes: CarMake[];
  /** Модели в каноническом виде. */
  models: { make: CarMake; canonical: string }[];
  /** Индексы найденных моделей в исходной строке (для корректной вставки марки). */
  firstModelIndex: number | null;
  /** true, если марка уже присутствует в name (Opel/Chevrolet/GM/General Motors/Cadillac). */
  makeAlreadyInName: boolean;
}

/**
 * Ищет модели из справочника car-models в normalized name.
 * Возвращает первые вхождения каждой модели (без дублей).
 */
export function detectCar(normalizedName: string): DetectedCar {
  const lower = normalizedName.toLowerCase();

  const makeAlreadyInName = MAKE_TOKENS_IN_NAME.some((t) =>
    new RegExp(`\\b${escapeRegExp(t)}\\b`, "i").test(normalizedName),
  );

  const found: { make: CarMake; canonical: string; index: number }[] = [];
  for (const model of CAR_MODELS) {
    for (const alias of model.aliases) {
      const idx = lower.indexOf(alias.toLowerCase());
      if (idx >= 0) {
        found.push({ make: model.make, canonical: model.canonical, index: idx });
        break;
      }
    }
  }

  // Уникализируем по canonical.
  const uniqByCanonical = new Map<string, (typeof found)[number]>();
  for (const f of found) {
    const key = `${f.make}:${f.canonical}`;
    const prev = uniqByCanonical.get(key);
    if (!prev || f.index < prev.index) uniqByCanonical.set(key, f);
  }
  const models = Array.from(uniqByCanonical.values()).sort((a, b) => a.index - b.index);

  const makes = Array.from(new Set(models.map((m) => m.make)));
  const firstModelIndex = models[0]?.index ?? null;

  return {
    makes,
    models: models.map((m) => ({ make: m.make, canonical: m.canonical })),
    firstModelIndex,
    makeAlreadyInName,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Step 2:** `npm run typecheck`.

- [ ] **Step 3:** Commit:
```
git add src/app/lib/import/detect-car.ts
git commit -m "feat(import): определение марки и моделей в имени"
```

---

## Task 6 — переписывание имени (вставка марки + артикул в конец)

**Files:** Create `src/app/lib/import/rewrite-name.ts`

- [ ] **Step 1:** Создать файл:

```ts
import { normalizeName } from "./normalize-name";
import { detectCar } from "./detect-car";
import type { CarMake } from "../../data/car-models";

export interface RewriteResult {
  /** Финальное name для БД. */
  name: string;
  /** Поле products.car — склеенные марки+модели для фильтрации в каталоге. */
  car: string;
  /** true, если модель в имени не нашлась и марку подставить не удалось. */
  unresolved: boolean;
}

/**
 * Формула: {name с подставленной маркой перед моделью} | арт. {sku}
 *
 * Мульти-модельные кейсы:
 *   - одна марка, несколько моделей: "Opel Astra H/J" — марка ставится один раз
 *   - разные марки: "Opel Astra J/Chevrolet Cruze" — каждая пара make+model
 */
export function rewriteName(rawName: string, sku: string): RewriteResult {
  const normalized = normalizeName(rawName);
  const det = detectCar(normalized);

  let car = "";
  if (det.models.length > 0) {
    car = formatCarField(det.models);
  }

  let body = normalized;

  if (det.models.length > 0 && !det.makeAlreadyInName && det.firstModelIndex !== null) {
    body = insertMakesBeforeFirstModel(normalized, det);
  }

  const name = `${body} | арт. ${sku}`;
  const unresolved = det.models.length === 0;

  return { name, car, unresolved };
}

function formatCarField(models: { make: CarMake; canonical: string }[]): string {
  // Группируем по марке.
  const byMake = new Map<CarMake, string[]>();
  for (const m of models) {
    const list = byMake.get(m.make) ?? [];
    list.push(m.canonical);
    byMake.set(m.make, list);
  }

  const parts: string[] = [];
  for (const [make, mods] of byMake.entries()) {
    const joined = collapseModels(mods);
    parts.push(`${make} ${joined}`);
  }
  return parts.join("/");
}

/**
 * «Astra H, Astra J» → «Astra H/J» когда общий корень.
 * Иначе — через «/».
 */
function collapseModels(models: string[]): string {
  if (models.length === 1) return models[0];
  const first = models[0];
  const prefix = first.split(" ")[0];
  const allSamePrefix = models.every((m) => m.startsWith(prefix + " ") || m === prefix);
  if (allSamePrefix) {
    const suffixes = models.map((m) => m.slice(prefix.length).trim()).filter(Boolean);
    return `${prefix} ${suffixes.join("/")}`;
  }
  return models.join("/");
}

function insertMakesBeforeFirstModel(
  normalized: string,
  det: ReturnType<typeof detectCar>,
): string {
  const idx = det.firstModelIndex!;
  const prefix = normalized.slice(0, idx).trimEnd();
  const rest = normalized.slice(idx);

  // Все модели — группируем по марке и собираем подобно car-полю, но с учётом того,
  // что модели ДОЛЖНЫ быть оставлены в строке (rest уже содержит их текстово),
  // поэтому здесь подставляем только марку. Для мульти-марочных:
  // "Cruze/Astra J" → "Chevrolet Cruze/Opel Astra J" — перезапишем rest.
  if (det.makes.length === 1) {
    return `${prefix} ${det.makes[0]} ${rest}`.replace(/\s+/g, " ").trim();
  }

  // Мульти-марочный кейс: нужно заменить сам кусок с моделями.
  // Находим верхнюю границу куска моделей — берём от firstModelIndex до пробела после последней модели.
  // Проще: заменить известные алиасы внутри rest на `{make} {canonical}`.
  let rewrittenRest = rest;
  for (const m of det.models) {
    // Берём оригинальный алиас, который сработал. Не самый оптимальный подход,
    // но достаточный: ищем canonical в rest (после normalizeName дефисы уже заменены).
    const re = new RegExp(`\\b${m.canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    rewrittenRest = rewrittenRest.replace(re, `${m.make} ${m.canonical}`);
  }
  // Склейки моделей через «/» уже есть в rest — «Cruze/Astra J» станет «Chevrolet Cruze/Opel Astra J».
  return `${prefix} ${rewrittenRest}`.replace(/\s+/g, " ").trim();
}
```

- [ ] **Step 2:** `npm run typecheck`.

- [ ] **Step 3:** Commit:
```
git add src/app/lib/import/rewrite-name.ts
git commit -m "feat(import): переписывание имени с маркой и артикулом в конце"
```

---

## Task 7 — фильтр не-GM и химии

**Files:** Create `src/app/lib/import/classify.ts`

- [ ] **Step 1:** Создать файл:

```ts
import { NON_GM_MARKERS } from "../../data/non-gm-markers";
import { CHEMISTRY_MARKERS } from "../../data/chemistry-markers";

export type RejectReason = "non-gm" | "chemistry";

/**
 * Возвращает причину отбраковки или null, если позиция проходит фильтр.
 */
export function classify(name: string, brand: string): RejectReason | null {
  const haystack = `${name} ${brand}`.toLowerCase();

  for (const token of NON_GM_MARKERS) {
    const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, "i");
    if (re.test(haystack)) return "non-gm";
  }
  for (const token of CHEMISTRY_MARKERS) {
    if (haystack.includes(token.toLowerCase())) return "chemistry";
  }
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Step 2:** `npm run typecheck`.

- [ ] **Step 3:** Commit:
```
git add src/app/lib/import/classify.ts
git commit -m "feat(import): фильтр не-GM и химии"
```

---

## Task 8 — определение категории по ключам

**Files:** Create `src/app/lib/import/detect-category.ts`

- [ ] **Step 1:** Создать файл:

```ts
import { CATEGORY_RULES } from "../../data/category-rules";

/**
 * Возвращает sectionSlug первого совпадения или null.
 */
export function detectCategory(name: string): string | null {
  const lower = name.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.sectionSlug;
    }
  }
  return null;
}
```

- [ ] **Step 2:** `npm run typecheck`.

- [ ] **Step 3:** Commit:
```
git add src/app/lib/import/detect-category.ts
git commit -m "feat(import): определение категории по ключевым словам"
```

---

## Task 9 — валидационный скрипт на реальном Excel

**Files:** Create `scripts/validate-import-rules.ts`

- [ ] **Step 1:** Создать файл:

```ts
/**
 * Прогон логики импорта по реальному прайсу ~/Desktop/artikuly.xlsx
 * (лист «Лист1»). Вывод статистики покрытия.
 *
 * Запуск: npx tsx scripts/validate-import-rules.ts <path-to-xlsx>
 */
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { classify } from "../src/app/lib/import/classify";
import { rewriteName } from "../src/app/lib/import/rewrite-name";
import { detectCategory } from "../src/app/lib/import/detect-category";

const path = process.argv[2] ?? `${process.env.HOME}/Desktop/artikuly.xlsx`;
const wb = XLSX.read(readFileSync(path));
const sheetName = wb.SheetNames.includes("Лист1") ? "Лист1" : wb.SheetNames[0];
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
  header: "A",
});

let total = 0, rejected = 0, categorized = 0, uncategorized = 0, unresolvedCar = 0;
const unmatched: Record<string, { count: number; example: string }> = {};

for (const row of rows) {
  // Определяем колонки: если это «Лист1» — A=sku, B=name, C=brand.
  // Если «Артикулы» — C=name, D=sku, E=brand.
  const name = String(row["B"] ?? row["C"] ?? "").trim();
  const sku = String(row["A"] ?? row["D"] ?? "").trim();
  const brand = String(row["C"] ?? row["E"] ?? "").trim();
  if (!name || !sku) continue;
  total++;
  const reject = classify(name, brand);
  if (reject) { rejected++; continue; }
  const rewrite = rewriteName(name, sku);
  if (rewrite.unresolved) unresolvedCar++;
  const section = detectCategory(name);
  if (section) categorized++;
  else {
    uncategorized++;
    const firstTwo = name.match(/([А-ЯЁа-яё][А-ЯЁа-яё-]+)(\s+[а-яё][а-яё-]+)?/)?.[0] ?? "?";
    const key = firstTwo.toLowerCase();
    if (!unmatched[key]) unmatched[key] = { count: 0, example: name };
    unmatched[key].count++;
  }
}

const effective = total - rejected;
console.log(`Total rows: ${total}`);
console.log(`Rejected (non-GM/chemistry): ${rejected} (${pct(rejected, total)})`);
console.log(`Effective GM positions: ${effective}`);
console.log(`Categorized: ${categorized} (${pct(categorized, effective)})`);
console.log(`Uncategorized: ${uncategorized} (${pct(uncategorized, effective)})`);
console.log(`Unresolved car (no model match): ${unresolvedCar} (${pct(unresolvedCar, effective)})`);
console.log(`\nTop 20 uncategorized types:`);
const top = Object.entries(unmatched).sort((a, b) => b[1].count - a[1].count).slice(0, 20);
for (const [k, v] of top) console.log(`  ${v.count.toString().padStart(4)}  ${k.padEnd(30)} | ${v.example.slice(0, 80)}`);

function pct(n: number, d: number): string {
  return d === 0 ? "0%" : `${(n * 100 / d).toFixed(1)}%`;
}
```

- [ ] **Step 2:** Запустить:

```bash
npx tsx scripts/validate-import-rules.ts
```

Ожидаемо: `Rejected ≈ 10-15%`, `Categorized ≥ 85%` от оставшихся, `Unresolved car ≤ 50%` (многие позиции реально без модели — химия, универсалии; они всё равно уже отфильтрованы).

- [ ] **Step 3:** Если категоризация < 85%: пополнить `CATEGORY_RULES` по верхним 20 `unmatched` типам. Запустить скрипт повторно до целевого покрытия.

- [ ] **Step 4:** Commit скрипта и возможных правок правил:

```
git add scripts/validate-import-rules.ts src/app/data/category-rules.ts
git commit -m "chore(import): валидационный скрипт + донастройка правил по реальному прайсу"
```

---

## Task 10 — расширение import-роута (превью с тремя ведрами)

**Files:** Modify `src/app/api/admin/products/import/route.ts`

- [ ] **Step 1:** Переписать весь файл:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import * as XLSX from "xlsx";
import { classify, type RejectReason } from "@/app/lib/import/classify";
import { rewriteName } from "@/app/lib/import/rewrite-name";
import { detectCategory } from "@/app/lib/import/detect-category";

export interface ParsedRow {
  sku: string;
  name: string;          // финальное (переписанное)
  rawName: string;       // как было в Excel
  brand: string;
  price: number;
  car: string;
  sectionSlug: string | null;
}

export interface DuplicateRow extends ParsedRow {
  existing: { id: number; name: string; price: number; brand: string };
}

export interface RejectedRow {
  sku: string;
  rawName: string;
  brand: string;
  price: number;
  reason: RejectReason;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Файл не загружен" }, { status: 400 });
  if (!/\.xlsx?$/i.test(file.name))
    return NextResponse.json({ error: "Допустимые форматы: .xlsx, .xls" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "Максимальный размер файла: 10MB" }, { status: 400 });

  try {
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: "A" });

    const newItems: ParsedRow[] = [];
    const duplicates: DuplicateRow[] = [];
    const rejected: RejectedRow[] = [];

    // Колонки C=name, D=sku, E=brand, F=price.
    for (const row of rows) {
      const rawName = String(row["C"] ?? "").trim();
      const sku = String(row["D"] ?? "").trim();
      const brand = String(row["E"] ?? "").trim();
      const rawPrice = row["F"];
      if (!rawName || !sku) continue;
      const price =
        typeof rawPrice === "number"
          ? Math.round(rawPrice)
          : parseInt(String(rawPrice ?? "0").replace(/[^\d]/g, ""), 10) || 0;

      const reject = classify(rawName, brand);
      if (reject) {
        rejected.push({ sku, rawName, brand, price, reason: reject });
        continue;
      }

      const rw = rewriteName(rawName, sku);
      const sectionSlug = detectCategory(rawName);
      const parsed: ParsedRow = {
        sku,
        name: rw.name,
        rawName,
        brand,
        price,
        car: rw.car,
        sectionSlug,
      };

      const existing = db.select().from(schema.products).all().find((p) => p.sku === sku);
      if (existing) {
        duplicates.push({
          ...parsed,
          existing: { id: existing.id, name: existing.name, price: existing.price, brand: existing.brand },
        });
      } else {
        newItems.push(parsed);
      }
    }

    return NextResponse.json({
      newItems,
      duplicates,
      rejected,
      totalParsed: newItems.length + duplicates.length + rejected.length,
    });
  } catch (e) {
    console.error("Excel import parse error:", e);
    return NextResponse.json({ error: "Ошибка чтения файла Excel" }, { status: 500 });
  }
}
```

- [ ] **Step 2:** `npm run typecheck`, `npm run lint`.

- [ ] **Step 3:** Commit:
```
git add src/app/api/admin/products/import/route.ts
git commit -m "feat(import): превью с тремя ведрами (новые/совпадения/отброшено)"
```

---

## Task 11 — расширение confirm-роута

**Files:** Modify `src/app/api/admin/products/import/confirm/route.ts`

- [ ] **Step 1:** Переписать: принимает список `newItems` с финальными полями (включая `sectionSlug`, `car`), подтягивает `categoryId` из таблицы `categories` по slug.

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

interface ImportItem {
  sku: string;
  name: string;
  brand: string;
  price: number;
  car: string;
  sectionSlug: string | null;
}
interface UpdateItem extends ImportItem { id: number; }

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  let body: { newItems?: ImportItem[]; updateIds?: UpdateItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const newItems = body.newItems ?? [];
  const updateIds = body.updateIds ?? [];
  const now = new Date().toISOString();
  const errors: string[] = [];
  let added = 0, updated = 0;

  // Подтягиваем карту slug → categoryId.
  const cats = db.select().from(schema.categories).all();
  const slugToId = new Map(cats.map((c) => [c.slug, c.id]));

  for (const item of newItems) {
    const sku = item.sku.trim();
    const name = item.name.trim();
    const brand = item.brand.trim();
    const price = Number(item.price);
    if (!sku || !name || !Number.isFinite(price) || price < 0) {
      errors.push(`Пропущено: некорректные данные для "${item.sku}"`);
      continue;
    }
    const categoryId = item.sectionSlug ? slugToId.get(item.sectionSlug) ?? null : null;
    try {
      const externalId = `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      db.insert(schema.products).values({
        externalId, sku, name, brand,
        price: Math.round(price),
        inStock: 1,
        car: item.car,
        categoryId,
        createdAt: now,
        updatedAt: now,
      }).run();
      added++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/UNIQUE constraint failed: products\.sku/i.test(msg))
        errors.push(`Артикул "${sku}" уже существует — пропущено`);
      else errors.push(`Ошибка добавления ${sku}: ${msg}`);
    }
  }

  for (const item of updateIds) {
    const categoryId = item.sectionSlug ? slugToId.get(item.sectionSlug) ?? null : null;
    try {
      db.update(schema.products).set({
        name: item.name, brand: item.brand, price: item.price,
        car: item.car, categoryId, updatedAt: now,
      }).where(eq(schema.products.id, item.id)).run();
      updated++;
    } catch (e) {
      errors.push(`Ошибка обновления id=${item.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ added, updated, errors });
}
```

- [ ] **Step 2:** `npm run typecheck`, `npm run lint`.

- [ ] **Step 3:** Commit:
```
git add src/app/api/admin/products/import/confirm/route.ts
git commit -m "feat(import): запись категории и марки авто при подтверждении"
```

---

## Task 12 — сидирование таблицы categories из CATALOG_SECTIONS

**Files:** Create `src/app/lib/db/seed-categories.ts`, modify `src/app/lib/db/index.ts`

- [ ] **Step 1:** Создать `src/app/lib/db/seed-categories.ts`:

```ts
import { db, schema } from "./index";
import { CATALOG_SECTIONS, CATALOG_GROUPS } from "../../data/catalog-sections";
import { eq } from "drizzle-orm";

/**
 * Синхронизирует таблицу categories с хардкодом CATALOG_SECTIONS.
 * Добавляет отсутствующие slug, обновляет title/group для существующих.
 * Старые slug, которых больше нет в хардкоде, не трогает.
 */
export function seedCategories(): void {
  const now = new Date().toISOString();
  const groupBySlug = new Map(CATALOG_GROUPS.map((g) => [g.slug, g.title]));
  const existing = db.select().from(schema.categories).all();
  const existingBySlug = new Map(existing.map((c) => [c.slug, c]));

  for (let i = 0; i < CATALOG_SECTIONS.length; i++) {
    const section = CATALOG_SECTIONS[i];
    const groupName = groupBySlug.get(section.groupSlug) ?? section.groupSlug;
    const prev = existingBySlug.get(section.slug);
    if (!prev) {
      db.insert(schema.categories).values({
        slug: section.slug,
        title: section.title,
        groupSlug: section.groupSlug,
        groupName,
        sortOrder: i,
        createdAt: now,
      }).run();
    } else if (prev.title !== section.title || prev.groupSlug !== section.groupSlug || prev.groupName !== groupName) {
      db.update(schema.categories).set({
        title: section.title,
        groupSlug: section.groupSlug,
        groupName,
        sortOrder: i,
      }).where(eq(schema.categories.id, prev.id)).run();
    }
  }
}
```

- [ ] **Step 2:** В `src/app/lib/db/index.ts` (или главный боевой файл, где инициализация БД) вызвать `seedCategories()` один раз при старте. Найти файл:

```bash
grep -rn "migrate\|better-sqlite3\|new Database" src/app/lib/db/ | head -5
```

Встроить `seedCategories()` после запуска миграций (если есть) или в конец инициализации:

```ts
import { seedCategories } from "./seed-categories";
// ...
seedCategories();
```

- [ ] **Step 3:** Запустить dev: `npm run dev`. Убедиться что `categories` в БД заполнена (`sqlite3 data/shop.db "SELECT slug, title, group_slug FROM categories;"`).

- [ ] **Step 4:** Commit:
```
git add src/app/lib/db/seed-categories.ts src/app/lib/db/index.ts
git commit -m "feat(catalog): автосидирование categories из CATALOG_SECTIONS"
```

---

## Task 13 — UI превью импорта (3 секции + редактирование)

**Files:** Modify `src/app/admin/components/ExcelImport.tsx`

- [ ] **Step 1:** Расширить компонент. Вместо 2 секций (Новые / Совпадения) — 3 (+ Отброшено). Для каждой «новой» строки — редактируемые поля (name, brand, price, selector section, input car).

Основные изменения (ключевые фрагменты, остальное по образцу текущего кода):

```tsx
type RowStatus = "new" | "duplicate" | "rejected";

interface ParsedItemLive {
  sku: string;
  name: string;
  rawName: string;
  brand: string;
  price: number;
  car: string;
  sectionSlug: string | null;
}

// Состояние: preview.newItems как массив, редактируемый.
// Добавить handler'ы для изменения каждого поля.

// В секции "Отброшено" — список с колонкой "Причина": Не-GM / Химия.

// Для секции "Новые":
// <select value={item.sectionSlug ?? ""} onChange={...}>
//   <option value="">— без категории —</option>
//   {CATALOG_SECTIONS.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
// </select>
// <input value={item.car} onChange={...} placeholder="Opel Astra H" />
```

Полную реализацию писать из текущего файла как основы. При редактировании — локальный state на массив, при «Подтвердить» — отправляем `{ newItems: editedItems, updateIds: editedUpdates }` на `/api/admin/products/import/confirm`.

- [ ] **Step 2:** `npm run typecheck`, `npm run lint`.

- [ ] **Step 3:** Проверка в браузере через preview_start + загрузка тестового файла `~/Desktop/artikuly.xlsx`. Убедиться что:
  - секция «Отброшено» показывает позиции с не-GM и химией
  - для «новых» редактируются поля, селект категории рабочий
  - после подтверждения товары пишутся в БД с заполненным `car` и `categoryId`

- [ ] **Step 4:** Commit:
```
git add src/app/admin/components/ExcelImport.tsx
git commit -m "feat(import): 3-секционное превью с редактированием категории и марки"
```

---

## Task 14 — batch-инструмент «Без категории» в админке товаров

**Files:** Modify `src/app/admin/(app)/products/page.tsx`, create `src/app/admin/(app)/products/_components/BulkCategoryModal.tsx`, modify `src/app/api/admin/products/bulk/route.ts`

- [ ] **Step 1:** Посмотреть текущую `src/app/admin/(app)/products/page.tsx`, найти место с фильтрами. Добавить кнопку-фильтр «Без категории» (query-param `?nocat=1`). Выборка: `WHERE categoryId IS NULL`.

- [ ] **Step 2:** Добавить чекбоксы на каждой строке списка + «выбрать всю страницу». В состоянии — `Set<number>` выбранных id.

- [ ] **Step 3:** Создать `BulkCategoryModal.tsx`:

```tsx
"use client";
import { useState } from "react";
import { CATALOG_SECTIONS } from "@/app/data/catalog-sections";

interface Props {
  ids: number[];
  onClose: () => void;
  onDone: () => void;
}

export function BulkCategoryModal({ ids, onClose, onDone }: Props) {
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!slug) return;
    setSaving(true);
    const res = await fetch("/api/admin/products/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, sectionSlug: slug }),
    });
    setSaving(false);
    if (res.ok) { onDone(); onClose(); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 p-6 rounded-lg w-96">
        <h3 className="text-lg font-medium mb-4">Назначить категорию для {ids.length} товаров</h3>
        <select className="w-full mb-4 p-2 bg-slate-800 rounded" value={slug} onChange={(e) => setSlug(e.target.value)}>
          <option value="">— выберите раздел —</option>
          {CATALOG_SECTIONS.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
        </select>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 rounded">Отмена</button>
          <button disabled={!slug || saving} onClick={submit} className="px-4 py-2 bg-blue-600 rounded disabled:opacity-50">
            {saving ? "Сохранение..." : "Применить"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4:** Добавить в `src/app/api/admin/products/bulk/route.ts` метод `PATCH` с полезной нагрузкой `{ ids: number[], sectionSlug: string }`. Находит `categoryId` по slug, обновляет всех сразу.

```ts
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;
  const { ids, sectionSlug } = await req.json();
  if (!Array.isArray(ids) || !sectionSlug) return NextResponse.json({ error: "bad" }, { status: 400 });
  const cat = db.select().from(schema.categories).all().find((c) => c.slug === sectionSlug);
  if (!cat) return NextResponse.json({ error: "unknown slug" }, { status: 400 });
  const now = new Date().toISOString();
  let n = 0;
  for (const id of ids) {
    db.update(schema.products).set({ categoryId: cat.id, updatedAt: now }).where(eq(schema.products.id, id)).run();
    n++;
  }
  return NextResponse.json({ updated: n });
}
```

- [ ] **Step 5:** В `page.tsx` подключить модалку. Проверка в браузере:
  - Импортировать Excel → убедиться что часть товаров с `categoryId = null`.
  - Применить фильтр «Без категории» → видны только они.
  - Выделить несколько чекбоксами → кнопка «Назначить категорию» → выбрать раздел → товары уходят из списка.

- [ ] **Step 6:** Commit:
```
git add src/app/admin/\(app\)/products/page.tsx src/app/admin/\(app\)/products/_components/BulkCategoryModal.tsx src/app/api/admin/products/bulk/route.ts
git commit -m "feat(admin): batch-назначение категории для товаров без категории"
```

---

## Task 15 — расширение генератора описаний

**Files:** Modify `src/app/lib/product-description-gen.ts`

- [ ] **Step 1:** Заменить словарь `CATEGORY_PHRASE_MAP` на полный — все 50 разделов. Шаблоны:

```ts
const CATEGORY_PHRASE_MAP: Record<string, string> = {
  "Воздушные фильтры": "воздушный фильтр",
  "Салонные фильтры": "салонный фильтр",
  "Масляные фильтры": "масляный фильтр",
  "Топливные фильтры": "топливный фильтр",
  "Фильтры АКПП": "фильтр АКПП",
  "Свечи зажигания": "свеча зажигания",
  "Щётки стеклоочистителя": "щётка стеклоочистителя",
  "Лампы": "лампа",
  "Поликлиновые ремни": "поликлиновый ремень",
  "Ремни генератора": "ремень генератора",
  "Ролики и натяжители": "ролик-натяжитель",
  "Тормозные колодки": "тормозные колодки",
  "Тормозные диски": "тормозной диск",
  "Тормозные шланги": "тормозной шланг",
  "Суппорты и ремкомплекты": "элемент тормозного суппорта",
  "Трос ручника": "трос ручного тормоза",
  "Амортизаторы": "амортизатор",
  "Стабилизатор": "элемент стабилизатора",
  "Шаровые опоры": "шаровая опора",
  "Рулевые тяги и наконечники": "рулевой элемент",
  "Рычаги": "рычаг подвески",
  "Сайлентблоки": "сайлентблок",
  "Пружины": "пружина подвески",
  "Пыльники": "пыльник",
  "Ступицы и подшипники": "ступичный элемент",
  "ШРУС": "ШРУС",
  "Опоры двигателя": "опора двигателя",
  "Радиаторы": "радиатор",
  "Помпы": "водяная помпа",
  "Термостаты": "термостат",
  "Бачки расширительные": "расширительный бачок",
  "Патрубки и шланги": "патрубок системы охлаждения",
  "Мотор отопителя": "мотор отопителя салона",
  "Катушки зажигания": "катушка зажигания",
  "Модули зажигания": "модуль зажигания",
  "Высоковольтные провода": "комплект высоковольтных проводов",
  "Прокладки ДВС": "прокладка двигателя",
  "Уплотнительные кольца": "уплотнительное кольцо",
  "Сальники": "сальник",
  "Поршневая группа": "деталь поршневой группы",
  "Сцепление": "элемент сцепления",
  "Цилиндры сцепления": "цилиндр сцепления",
  "Насосы топливные": "топливный насос",
  "Клапаны ДВС": "клапан двигателя",
  "Маховики": "маховик",
  "Датчики": "датчик",
  "Генераторы и стартеры": "элемент электропривода",
  "Аккумуляторы": "аккумулятор",
  "Тюнинг и прошивки": "компонент чип-тюнинга",
  "Предохранители": "предохранитель",
  "Глушители и гофры": "элемент выхлопной системы",
  "Бамперы и накладки": "кузовной элемент бампера",
  "Подкрылки": "подкрылок",
  "Стёкла зеркал": "стекло зеркала",
  "Решётки и молдинги": "декоративный кузовной элемент",
  "Головки и биты": "инструмент: головка/бита",
  "Ключи": "ключ",
  "Вставки резьбовые": "резьбовая вставка",
  "Компрессоры кондиционера": "компрессор кондиционера",
  "Клапаны и фитинги A/C": "элемент системы кондиционирования",
  "Болты": "болт",
  "Гайки": "гайка",
  "Клипсы и пистоны": "кузовной крепёж",
  "Насосы стеклоомывателя": "насос стеклоомывателя",
  "Форсунки омывателя": "форсунка омывателя",
  "Бачки омывателя": "бачок омывателя",
};
```

- [ ] **Step 2:** Расширить `CLOSING_PHRASES` до 15 вариантов (добавить 9 новых):

```ts
const CLOSING_PHRASES = [
  "В наличии, отправка из Екатеринбурга.",
  "Склад Екатеринбург, доставка по РФ.",
  "Есть на складе, быстрая отправка.",
  "В наличии в Екатеринбурге, отправим по РФ.",
  "На складе, доставка по России.",
  "Готов к отправке из Екатеринбурга.",
  "Доступен к заказу из Екатеринбурга.",
  "Отправка со склада в Екатеринбурге — по всей России.",
  "В наличии на складе, отгрузка в день заказа.",
  "Екатеринбургский склад, быстрая доставка.",
  "Готов к отгрузке, склад в Екатеринбурге.",
  "Под заказ не нужно — есть в наличии.",
  "Товар на складе, отправка по России без задержек.",
  "Склад Екатеринбурга — отправим транспортной.",
  "В наличии, возможна отправка почтой и ТК.",
];
```

- [ ] **Step 3:** В `generateProductDescription` при наличии `product.car` добавить в первую часть упоминание модели. Сейчас уже есть `для ${product.car}` — оставляем. Никаких инвазивных правок.

- [ ] **Step 4:** `npm run typecheck`, `npm run lint`.

- [ ] **Step 5:** Проверка в браузере: открыть карточку импортированного товара — убедиться что описание вариативное и упоминает категорию + модель.

- [ ] **Step 6:** Commit:
```
git add src/app/lib/product-description-gen.ts
git commit -m "feat(seo): шаблоны описаний под 13 новых групп каталога"
```

---

## Финальный прогон

- [ ] **Step 1:** `npm run typecheck && npm run lint && npm run build` — всё зелёным.

- [ ] **Step 2:** Загрузить `~/Desktop/artikuly.xlsx` через админку → проверить превью → подтвердить импорт → открыть сайт, увидеть товары в новых разделах.

- [ ] **Step 3:** Финальный коммит:
```
git commit --allow-empty -m "chore: завершение каталога 13 групп + пост-импорта из 1С"
```

---

## Self-review

**Покрытие спека:**
- Раздел 2 (структура каталога 13 групп) → Task 1, 12 ✓
- Раздел 3.1 (пайплайн импорта) → Tasks 4-11 ✓
- Раздел 3.2 (переписывание name) → Task 6 ✓
- Раздел 3.3 (правила категоризации) → Task 3, 8 ✓
- Раздел 3.4 (фильтр не-GM) → Task 2, 7 ✓
- Раздел 3.5 (фильтр химии) → Task 2, 7 ✓
- Раздел 3.6 (SEO-описания) → Task 15 ✓
- Раздел 4 (UI превью) → Task 13 ✓
- Раздел 5 (batch-разметка) → Task 14 ✓
- Раздел 6 (хардкод, без миграции) → через Task 12 (сид из CATALOG_SECTIONS)
- Раздел 7 (out-of-scope: SEO-хабы, миграция products.ts) — не трогаем

**Риски при исполнении:**
- Task 1 может наломать существующие ссылки — исправляем в Step 3.
- Task 12 ожидает работающую инициализацию БД; если сидирование уже есть в проекте, место вставки может быть другим — найти через grep.
- Task 13 самый объёмный по UI-коду; рекомендую дробить на подшаги в процессе.
