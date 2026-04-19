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
