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
};

/** Пилот: строки 1–20 из «топ 100 продаж опель.xlsx» (название, артикул, кол-во, цена продажи). */
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
    analogIds: ["opel-10"],
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
    image: "/images/catalog/opel-3456-rings.jpg",
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
    analogIds: ["opel-9"],
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
    image: "/images/catalog/opel-3456-rings.jpg",
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
    image: "/images/catalog/opel-3456-rings.jpg",
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
    image: "/images/catalog/opel-78-rings.jpg",
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
    image: "/images/catalog/opel-78-rings.jpg",
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
    analogIds: ["opel-4"],
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
    analogIds: ["opel-1"],
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
    image: "/images/catalog/opel-78-rings.jpg",
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
    image: "/images/catalog/opel-78-rings.jpg",
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
    image: "/images/catalog/opel-78-rings.jpg",
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
    image: "/images/wipers.jpg",
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
    image: "/images/brake-pads.jpg",
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
    image: "/images/catalog/opel-78-rings.jpg",
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
    image: "/images/catalog/opel-2.jpg",
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
    image: "/images/radiator.jpg",
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
    image: "/images/catalog/opel-3456-rings.jpg",
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
    image: "/images/catalog/opel-3456-rings.jpg",
    description:
      "Маслосъёмный колпачок клапана для F18D4. Износ колпачков даёт дым из выхлопа на холостом ходу и повышенный расход масла — замена комплектом по головке.",
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
}));

/** Три позиции для главной — считается один раз при загрузке модуля, без сортировки на каждый запрос */
export const HOME_FEATURED_PRODUCTS = [...products].sort(sortProductsById).slice(0, 3);
