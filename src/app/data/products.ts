// data/products.ts
// Аналоги: только id из ЭТОГО же массива (связи из вашей выгрузки Excel), без интернета.

import { roundRetailRubles } from "../lib/price";

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
  /** Цена на витрине после округления вверх */
  price: number;
  /** Цена из файла до округления (справочно) */
  sourcePriceRub?: number;
  inStock: number;
  image: string;
  description: string;
  /** Ссылки на аналоги из того же каталога */
  analogIds?: string[];
};

/** Пилот: первые 10 строк из «топ 100 продаж опель.xlsx» (название, артикул, кол-во, цена продажи). */
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
    category: "Свечи зажигания",
    car: "Opel Astra H/J, Zafira B и др. (моторы Ecotec)",
    image: "/images/spark-plugs.jpg",
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
    category: "Система охлаждения двигателя",
    car: "Opel 1.6 Z16XER",
    image: "/images/radiator.jpg",
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
    category: "Прокладки и уплотнения",
    car: "Chevrolet Cruze, Opel (F16D4, F18D4)",
    image: "/images/air-filter.jpg",
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
    image: "/images/oil-filter.jpg",
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
    category: "Прокладки и уплотнения",
    car: "Opel 1.4 / 1.6 (A14XER, A16XER)",
    image: "/images/brake-fluid.jpg",
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
    category: "Прокладки и уплотнения",
    car: "Opel 1.4 / 1.6 (A14XER, A16XER)",
    image: "/images/wipers.jpg",
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
    category: "Прокладки и уплотнения",
    car: "Opel 1.6 / 1.8 Turbo и атмосферные Ecotec",
    image: "/images/brake-pads.jpg",
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
    category: "Прокладки и уплотнения",
    car: "Opel Z16XEL, Z18XER",
    image: "/images/battery.jpg",
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
    image: "/images/oil-filter.jpg",
    description:
      "Другая заводская спецификация масляного фильтра Hengst для тех же семейств Ecotec, что и E611HD442. Перед заказом сверяйте номер с установленным фильтром или каталогом по VIN.",
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
    category: "Свечи зажигания",
    car: "Opel Astra H/J, Zafira B и др. (Ecotec)",
    image: "/images/spark-plugs.jpg",
    description:
      "Оригинальная свеча зажигания GM для ряда бензиновых Ecotec. Ресурс и калильное число подобраны заводом; для сравнения по цене смотрите аналоги из того же каталога (например Bosch).",
    analogIds: ["opel-1"],
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
  sourcePriceRub: Math.round(r.priceRaw * 100) / 100,
  price: roundRetailRubles(r.priceRaw),
  inStock: Math.min(999, Math.max(0, Math.floor(r.qty))),
  image: r.image,
  description: r.description,
  analogIds: r.analogIds,
}));
