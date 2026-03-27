// data/products.ts
// Аналоги: только id из ЭТОГО же массива (связи из вашей выгрузки Excel), без интернета.

import { roundRetailRubles } from "../lib/price";
import { sortProductsById } from "./catalog-sections";

export type Product = {
  id: string;
  /** Номер запчасти (артикул / OEM из файла) */
  sku: string;
  name: string;
  brand: string;
  /** Страна бренда / типичное происхождение */
  country: string;
  category: string;
  car: string;
  /** Цена, ₽ */
  price: number;
  inStock: number;
  image: string;
  description: string;
  /** Ссылки на аналоги из того же каталога */
  analogIds?: string[];
  /** Структурированные характеристики для карточки товара */
  specs?: Array<{ label: string; value: string }>;
  /** OEM/кросс-номера для проверки совместимости */
  oemRefs?: string[];
  /** Технические примечания по установке/эксплуатации */
  technicalNotes?: string[];
};

/** Данные из «топ 100 продаж опель.xlsx» (название, артикул, кол-во, цена продажи), строки 1–30. */
const OPEL_PILOT_RAW: Array<{
  id: string;
  name: string;
  sku: string;
  qty: number;
  priceRaw: number;
  brand: string;
  country: string;
  category: string;
  car: string;
  image: string;
  description: string;
  analogIds?: string[];
  specs?: Array<{ label: string; value: string }>;
  oemRefs?: string[];
  technicalNotes?: string[];
}> = [
  {
    id: "opel-1",
    name: "Свеча зажигания BOSCH Z16XEP/XER, A16XER, A18XER, Z18XE/XER",
    sku: "0242229699",
    qty: 1526,
    priceRaw: 583.83,
    brand: "Bosch",
    country: "Германия",
    category: "Свечи и зажигание",
    car: "Opel Astra H/J, Zafira B и др. (моторы Ecotec)",
    image: "/images/catalog/opel-1.jpg",
    description:
      "Свеча зажигания Bosch Super Plus для бензиновых двигателей GM Ecotec с резьбой M14. Обеспечивает устойчивое воспламенение и ресурс в городском цикле. Подходит для замены по регламенту ТО.",
    analogIds: ["opel-10", "opel-23"],
    specs: [
      { label: "Тип детали", value: "Свеча зажигания" },
      { label: "Артикул производителя", value: "0242229699" },
      { label: "Резьба", value: "M14" },
      { label: "Назначение", value: "Бензиновые двигатели GM Ecotec" },
      { label: "Бренд", value: "Bosch" },
      { label: "Страна бренда", value: "Германия" },
    ],
    oemRefs: ["25193473"],
    technicalNotes: [
      "Рекомендуется замена комплектом по регламенту ТО.",
      "Перед установкой проверьте применяемость по VIN/артикулу.",
      "Момент затяжки и зазор электрода — по спецификации двигателя.",
    ],
  },
  {
    id: "opel-2",
    name: "Форсунка охлаждения поршня Z16XER",
    sku: "55564441",
    qty: 1035,
    priceRaw: 802.15,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Двигатель",
    car: "Opel 1.6 Z16XER",
    image: "/images/catalog/opel-2.jpg",
    description:
      "Оригинальная масляная форсунка для охлаждения днища поршня на двигателе Z16XER. Подаёт масло на теплонагруженные зоны; при закоксовке или течи двигатель перегревается — замену лучше не откладывать.",
  },
  {
    id: "opel-3",
    name: "Кольцо уплотнительное впускного канала маслоохладителя F16D4, F18D4",
    sku: "55353328",
    qty: 809,
    priceRaw: 452.44,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Прокладки, сальники и кольца",
    car: "Chevrolet Cruze, Opel (F16D4, F18D4)",
    image: "/images/catalog/opel-3.jpg",
    description:
      "Уплотнительное кольцо впускного канала теплообменника масла. При замене маслоохладителя или течи с сопряжения рекомендуется ставить новое кольцо для герметичности системы смазки.",
    analogIds: ["opel-5", "opel-6"],
  },
  {
    id: "opel-4",
    name: "Фильтр масляный HENGST Astra H/J A16XER, Z16XER, A18XER, Z18XER, A14XEL/XER/NEL",
    sku: "E611HD442",
    qty: 595,
    priceRaw: 812.67,
    brand: "Hengst",
    country: "Германия",
    category: "Масляные фильтры",
    car: "Opel Astra H/J, Zafira B и др.",
    image: "/images/catalog/opel-4.jpg",
    description:
      "Масляный фильтр Hengst для бензиновых Ecotec с резьбой и клапаном против слива. Рекомендуется менять вместе с маслом по интервалу производителя.",
    analogIds: ["opel-9", "opel-30"],
    specs: [
      { label: "Тип детали", value: "Фильтр масляный" },
      { label: "Артикул производителя", value: "E611HD442" },
      { label: "Бренд", value: "Hengst" },
      { label: "Страна бренда", value: "Германия" },
      { label: "Назначение", value: "Бензиновые двигатели Ecotec" },
      { label: "Конструктив", value: "С клапаном против слива" },
    ],
    oemRefs: ["E611HD122"],
    technicalNotes: [
      "Заменяйте одновременно с моторным маслом.",
      "Перед заказом сверяйте артикул с установленной деталью.",
      "После замены проверьте герметичность и давление масла.",
    ],
  },
  {
    id: "opel-5",
    name: "Кольцо уплотнительное трубки маслоохладителя A14XER, A16XER",
    sku: "55556547",
    qty: 551,
    priceRaw: 274.94,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Прокладки, сальники и кольца",
    car: "Opel 1.4 / 1.6 (A14XER, A16XER)",
    image: "/images/catalog/opel-5.jpg",
    description:
      "Кольцо уплотнения на патрубке маслоохладителя. Мелкая деталь, от которой зависит герметичность контуры охлаждения масла — при снятии трубки заменяйте обязательно.",
    analogIds: ["opel-3", "opel-6"],
  },
  {
    id: "opel-6",
    name: "Кольцо уплотнительное трубки маслоохладителя A14XER, A16XER",
    sku: "55354068",
    qty: 549,
    priceRaw: 279.81,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Прокладки, сальники и кольца",
    car: "Opel 1.4 / 1.6 (A14XER, A16XER)",
    image: "/images/catalog/opel-6.jpg",
    description:
      "Альтернативный номер уплотнительного кольца для линий маслоохладителя на тех же моторах A14XER/A16XER. Уточняйте по схеме узла при заказе — взаимозаменяемость с другими позициями из вашего файла указана в блоке аналогов.",
    analogIds: ["opel-3", "opel-5"],
  },
  {
    id: "opel-7",
    name: "Кольцо уплотнительное выпускного канала маслоохла Z18XER, Z16LET/LEL/LER/XEP/XE1",
    sku: "24445723",
    qty: 513,
    priceRaw: 570.49,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Прокладки, сальники и кольца",
    car: "Opel 1.6 / 1.8 Turbo и атмосферные Ecotec",
    image: "/images/catalog/opel-7.jpg",
    description:
      "Уплотнение выпускного канала маслоохладителя для ряда турбо и атмосферных двигателей Ecotec. При течи масла в зоне теплообменника меняется в комплекте с разбором узла.",
  },
  {
    id: "opel-8",
    name: "Кольцо уплотнительное выпускного канала маслоохладителя Z16XEL, Z18XER",
    sku: "55353331",
    qty: 502,
    priceRaw: 543.75,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Прокладки, сальники и кольца",
    car: "Opel Z16XEL, Z18XER",
    image: "/images/catalog/opel-8.jpg",
    description:
      "Кольцо на выпуск из маслоохладителя для Z16XEL и Z18XER. После демонтажа деталь не рекомендуется ставить повторно из‑за потери упругости.",
  },
  {
    id: "opel-9",
    name: "Фильтр масляный HENGST Astra H/J A16XER, Z16XER, A18XER, Z18XER, A14XEL/XER/NEL",
    sku: "E611HD122",
    qty: 493.5,
    priceRaw: 908.71,
    brand: "Hengst",
    country: "Германия",
    category: "Масляные фильтры",
    car: "Opel Astra H/J, Zafira B и др.",
    image: "/images/catalog/opel-9.jpg",
    description:
      "Другая заводская спецификация масляного фильтра Hengst для тех же семейств Ecotec, что и E611HD442. Перед заказом сверяйте номер с установленным фильтром или заводским каталогом.",
    analogIds: ["opel-4", "opel-30"],
  },
  {
    id: "opel-10",
    name: "Свеча зажигания Z16XEP/XER, A16XER, A18XER, Z18XE/XER",
    sku: "25193473",
    qty: 477,
    priceRaw: 657.93,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Свечи и зажигание",
    car: "Opel Astra H/J, Zafira B и др. (Ecotec)",
    image: "/images/catalog/opel-10.jpg",
    description:
      "Оригинальная свеча зажигания GM для ряда бензиновых Ecotec. Ресурс и калильное число подобраны заводом; для сравнения по цене смотрите аналоги из того же каталога (например Bosch).",
    analogIds: ["opel-1", "opel-23"],
  },
  {
    id: "opel-11",
    name: "Прокладка корпуса масляного фильтра Z18XER, Z16LET/LEL/LER",
    sku: "55353321",
    qty: 404,
    priceRaw: 530.23,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Прокладки, сальники и кольца",
    car: "Opel Z18XER, Z16LET / LEL / LER",
    image: "/images/catalog/opel-11.jpg",
    description:
      "Прокладка между корпусом масляного фильтра и блоком для ряда моторов Ecotec. При течи масла в зоне фильтра меняется вместе с очисткой посадочных поверхностей.",
    analogIds: ["opel-12"],
  },
  {
    id: "opel-12",
    name: "Прокладка корпуса масляного фильтра Z1.8XER, Z1.6LET, LEL, LER, XEP",
    sku: "55353319",
    qty: 403,
    priceRaw: 524.57,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Прокладки, сальники и кольца",
    car: "Opel 1.6 / 1.8 Ecotec (LET, LER, XEP и др.)",
    image: "/images/catalog/opel-12.jpg",
    description:
      "Альтернативный номер прокладки корпуса масляного фильтра под другие варианты компоновки Ecotec. Перед заказом сверяйте с заводским каталогом и снятой деталью.",
    analogIds: ["opel-11"],
  },
  {
    id: "opel-13",
    name: "Прокладка корпуса масляного фильтра к охладителю A16XER, A18XER, Z16XER, Z18XER",
    sku: "25199750",
    qty: 369,
    priceRaw: 1308.45,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Прокладки, сальники и кольца",
    car: "Opel Astra H/J, Zafira B (Ecotec)",
    image: "/images/catalog/opel-13.jpg",
    description:
      "Прокладка узла масляного фильтра в зоне теплообменника с охлаждением масла. Рекомендуется менять при снятии корпуса или при течи в этом сопряжении.",
    analogIds: ["opel-11", "opel-12"],
  },
  {
    id: "opel-14",
    name: "Лампа подсветки номера BOSCH W5W (5W)",
    sku: "1987302206",
    qty: 303,
    priceRaw: 52.25,
    brand: "Bosch",
    country: "Германия",
    category: "Автосвет и электрика",
    car: "Универсальная W5W (T10), уточняйте по авто",
    image: "/images/catalog/opel-14.jpg",
    description:
      "Галогеновая лампа Bosch W5W 5 Вт для подсветки номерного знака и других цоколей W2.1x9.5d. Соответствуйте мощность и тип цоколя штатной лампе.",
  },
  {
    id: "opel-15",
    name: "Тяга стабилизатора передняя DELPHI Astra-H c IDS+",
    sku: "TC879",
    qty: 258,
    priceRaw: 1214.75,
    brand: "Delphi",
    country: "США / ЕС",
    category: "Подвеска",
    car: "Opel Astra H с IDS+",
    image: "/images/catalog/opel-15.jpg",
    description:
      "Передняя тяга / стойка стабилизатора Delphi для Astra H с системой IDS+. Влияет на крен и сцепление с дорогой; люфт и стуки при проезде неровностей — повод проверить наконечники и втулки стабилизатора.",
  },
  {
    id: "opel-16",
    name: "Прокладка клапанной крышки ELRING Z18XER, Z16XER/XN/LEL/LER, A16XER",
    sku: "354030",
    qty: 223,
    priceRaw: 2046.39,
    brand: "Elring",
    country: "Германия",
    category: "Прокладки, сальники и кольца",
    car: "Opel / Chevrolet Ecotec (см. наименование)",
    image: "/images/catalog/opel-16.jpg",
    description:
      "Прокладка клапанной крышки Elring для ряда бензиновых Ecotec. Меняется при течи масла сверху двигателя или при снятии крышки для регулировки клапанов.",
  },
  {
    id: "opel-17",
    name: "Датчик температуры охлаждающей жидкости Г образный Astra-H, J, Corsa-D",
    sku: "55591401",
    qty: 222,
    priceRaw: 932.93,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Охлаждение",
    car: "Opel Astra H/J, Corsa D и др.",
    image: "/images/catalog/opel-17.jpg",
    description:
      "Датчик температуры ОЖ с Г-образным патрубком для системы охлаждения. Неисправность даёт ошибки по температуре, работу вентилятора и показания на панели.",
    analogIds: ["opel-18"],
  },
  {
    id: "opel-18",
    name: "Крышка расширительного бачка Cruze, Astra-J, Insignia, T300",
    sku: "YR00269780",
    qty: 213,
    priceRaw: 790.94,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Охлаждение",
    car: "Chevrolet Cruze, Opel Astra J, Insignia и др.",
    image: "/images/catalog/opel-18.jpg",
    description:
      "Крышка расширительного бачка системы охлаждения. Поддерживает рабочее давление в контуре; трещины и износ уплотнения приводят к потере ОЖ и перегреву.",
    analogIds: ["opel-17"],
  },
  {
    id: "opel-19",
    name: "Сальник распредвала передний Cruze F18D4",
    sku: "55563374",
    qty: 211,
    priceRaw: 628.43,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Прокладки, сальники и кольца",
    car: "Chevrolet Cruze 1.8 F18D4",
    image: "/images/catalog/opel-19.jpg",
    description:
      "Передний сальник распределительного вала для двигателя F18D4. При течи масла со стороны ГРМ меняется при снятии привода или цепи по регламенту.",
  },
  {
    id: "opel-20",
    name: "Колпачёк маслосъёмный Cruze F18D4",
    sku: "55574221",
    qty: 192,
    priceRaw: 186.46,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Двигатель",
    car: "Chevrolet Cruze 1.8 F18D4",
    image: "/images/catalog/opel-20.jpg",
    description:
      "Маслосъёмный колпачок клапана для F18D4. Износ колпачков даёт дым из выхлопа на холостом ходу и повышенный расход масла — замена комплектом по головке.",
  },
  {
    id: "opel-21",
    name: "Фильтр воздушный SIBTEK Astra-J, Cruze A14XEL/XER, A16XER",
    sku: "AF01109",
    qty: 172,
    priceRaw: 522.91,
    brand: "Sibtek",
    country: "Китай / ЕС",
    category: "Воздушные фильтры",
    car: "Opel Astra J, Chevrolet Cruze (A14XEL, A14XER, A16XER)",
    image: "/images/catalog/opel-4.jpg",
    description:
      "Воздушный фильтр для бензиновых турбо и атмосферных моторов семейства Ecotec на Astra J и Cruze. Меняется по регламенту ТО или при загрязнении — засор снижает отклик педали и расход топлива.",
  },
  {
    id: "opel-22",
    name: "Колпачёк маслосъёмный ELRING Z10XEP, A12XER, Z12XEP, Z14XEP, Z18XE",
    sku: "476691",
    qty: 168,
    priceRaw: 127.74,
    brand: "Elring",
    country: "Германия",
    category: "Двигатель",
    car: "Opel / Chevrolet (Z10XEP, A12XER, Z12XEP, Z14XEP, Z18XE)",
    image: "/images/catalog/opel-20.jpg",
    description:
      "Маслосъёмный колпачок Elring для ряда бензиновых двигателей. Рекомендуется менять комплектом при капремонте головки или при признаках прогара масла в камеру сгорания.",
  },
  {
    id: "opel-23",
    name: "Свеча зажигания BOSCH Astra J A14NEL/NET/VAG AUK/CAJA",
    sku: "0242240707",
    qty: 167,
    priceRaw: 1358.62,
    brand: "Bosch",
    country: "Германия",
    category: "Свечи и зажигание",
    car: "Opel Astra J A14NEL/NET; уточняйте по двигателю",
    image: "/images/catalog/opel-1.jpg",
    description:
      "Свеча зажигания Bosch для указанных модификаций моторов. Перед заказом сверяйте калильное число и резьбу со штатной свечой или каталогом.",
    analogIds: ["opel-1", "opel-10"],
  },
  {
    id: "opel-24",
    name: "Пистон подкрылка (12mm) IMS Corsa C, Vectra C, Meriva A, Zafira",
    sku: "23002100C",
    qty: 164,
    priceRaw: 15,
    brand: "IMS",
    country: "ЕС",
    category: "Кузов и крепёж",
    car: "Opel Corsa C, Vectra C, Meriva A, Zafira",
    image: "/images/catalog/opel-14.jpg",
    description:
      "Пластиковая клипса (пистон) крепления подкрылка и облицовок, 12 mm. При снятии подкрылка часто ломается — имеет смысл иметь запас при ремонте.",
  },
  {
    id: "opel-25",
    name: "Фильтр салонный SIBTEK Aveo T300/Astra-J/Cruze/Cobalt/Insignia/Mokka",
    sku: "AC0454",
    qty: 144,
    priceRaw: 492.14,
    brand: "Sibtek",
    country: "Китай / ЕС",
    category: "Салонные фильтры",
    car: "Chevrolet Aveo T300, Cruze, Cobalt; Opel Astra J, Insignia, Mokka",
    image: "/images/catalog/opel-4.jpg",
    description:
      "Салонный фильтр для перечисленных моделей. Рекомендуется менять 1–2 раза в год или при запахе и слабом потоке воздуха отопителя.",
  },
  {
    id: "opel-26",
    name: "Уплотнительное кольцо трубки маслоохладителя A14NEL",
    sku: "55568540",
    qty: 140,
    priceRaw: 1025.76,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Прокладки, сальники и кольца",
    car: "Opel / Chevrolet 1.4 A14NEL",
    image: "/images/catalog/opel-3.jpg",
    description:
      "Уплотнительное кольцо линии маслоохладителя для двигателя A14NEL. При демонтаже патрубка заменяйте кольцо — повторная установка старого часто даёт подсос и потерю масла.",
    analogIds: ["opel-3", "opel-5"],
  },
  {
    id: "opel-27",
    name: "Кольцо уплотнительное болта клапанной крышки Cruze F16D3",
    sku: "25185121",
    qty: 135,
    priceRaw: 104.56,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Прокладки, сальники и кольца",
    car: "Chevrolet Cruze 1.6 F16D3",
    image: "/images/catalog/opel-5.jpg",
    description:
      "Кольцо уплотнения болта крепления клапанной крышки для F16D3. Мелкая деталь при ТО крышки — ставьте новые кольца на все болты для герметичности.",
  },
  {
    id: "opel-28",
    name: "Крышка клапанная ГБЦ F16D4, F18D4",
    sku: "96889998",
    qty: 132,
    priceRaw: 16950.19,
    brand: "GM OE",
    country: "Европейский склад GM",
    category: "Двигатель",
    car: "Chevrolet Cruze F16D4, F18D4",
    image: "/images/catalog/opel-16.jpg",
    description:
      "Клапанная крышка в сборе / узел ГБЦ для Cruze с двигателями F16D4 и F18D4. Замена при трещинах, деформации или неконтролируемой течи масла сверху мотора — работы согласуйте с сервисом.",
  },
  {
    id: "opel-29",
    name: "Ремень ГРМ, к-кт SKF Astra/Vectra/Meriva/Zafira 1.6/1.8 (XEP, XER) 02-",
    sku: "VKMA05260",
    qty: 132,
    priceRaw: 9971.38,
    brand: "SKF",
    country: "Швеция / ЕС",
    category: "Двигатель",
    car: "Opel Astra, Vectra, Meriva, Zafira 1.6 / 1.8 (XEP, XER)",
    image: "/images/catalog/opel-15.jpg",
    description:
      "Комплект ремня ГРМ SKF для указанных моторов и годов выпуска. Меняется по регламенту или при шуме и люфте роликов; состав комплекта сверяйте с каталогом по VIN.",
  },
  {
    id: "opel-30",
    name: "Фильтр масляный FILTRON Astra H/J A16XER, Z16XER, A18XER, Z18XER, A14XEL/XER/NEL",
    sku: "OE6486",
    qty: 130,
    priceRaw: 634.35,
    brand: "Filtron",
    country: "Польша",
    category: "Масляные фильтры",
    car: "Opel Astra H/J, Zafira B и др. (Ecotec)",
    image: "/images/catalog/opel-4.jpg",
    description:
      "Масляный фильтр Filtron для бензиновых Ecotec с тем же применением, что у аналогов Hengst в каталоге. Перед заказом сверяйте номер с установленным фильтром.",
    analogIds: ["opel-4", "opel-9"],
  },
];

export const products: Product[] = OPEL_PILOT_RAW.map((r) => ({
  id: r.id,
  sku: r.sku,
  name: r.name,
  brand: r.brand,
  country: r.country,
  category: r.category,
  car: r.car,
  price: roundRetailRubles(r.priceRaw),
  inStock: Math.min(999, Math.max(0, Math.floor(r.qty))),
  image: r.image,
  description: r.description,
  analogIds: r.analogIds,
  specs: r.specs,
  oemRefs: r.oemRefs,
  technicalNotes: r.technicalNotes,
}));

/** Три позиции для главной — считается один раз при загрузке модуля, без сортировки на каждый запрос */
export const HOME_FEATURED_PRODUCTS = [...products].sort(sortProductsById).slice(0, 3);
