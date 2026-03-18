// data/products.ts
export type Product = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  car: string;
  price: number;
  inStock: number;
  image: string;
  description: string;
};

export const products: Product[] = [
  {
    id: "1",
    sku: "BP-FOCUS-001",
    name: "Тормозные колодки передние",
    brand: "TRW",
    car: "Opel Astra J (2009–2015)",
    price: 3200,
    inStock: 12,
    image: "/images/brake-pads.jpg",
    description: "Комплект передних тормозных колодок, без скрипа, ресурс до 40 000 км."
  },
  {
    id: "2",
    sku: "OIL-FLTR-TOY-002",
    name: "Масляный фильтр",
    brand: "MANN",
    car: "Chevrolet Cruze J300 (2011–2017)",
    price: 950,
    inStock: 25,
    image: "/images/oil-filter.jpg",
    description: "Оригинальное качество фильтрации, подходит для бензиновых двигателей."
  },
  {
    id: "3",
    sku: "AIR-FLTR-REN-003",
    name: "Воздушный фильтр",
    brand: "Bosch",
    car: "Opel Zafira C (2011–2019)",
    price: 780,
    inStock: 18,
    image: "/images/air-filter.jpg",
    description: "Увеличенный ресурс, улучшенная фильтрация воздуха."
  },
  {
    id: "4",
    sku: "SP-NGK-004",
    name: "Свечи зажигания (комплект 4 шт.)",
    brand: "NGK",
    car: "Cadillac SRX (2010–2016)",
    price: 2400,
    inStock: 8,
    image: "/images/spark-plugs.jpg",
    description: "Иридиевые свечи, увеличенный межсервисный интервал до 60 000 км."
  },
  {
    id: "5",
    sku: "WIP-BOS-005",
    name: "Щётки стеклоочистителя",
    brand: "Bosch",
    car: "Универсальные 600 мм",
    price: 650,
    inStock: 30,
    image: "/images/wipers.jpg",
    description: "Каркасные щётки, бесшумная работа, хорошая очистка."
  },
  {
    id: "6",
    sku: "BAT-VARTA-006",
    name: "Аккумулятор 60 А·ч",
    brand: "Varta",
    car: "Hummer H3 (2005–2010)",
    price: 8900,
    inStock: 5,
    image: "/images/battery.jpg",
    description: "Пусковой ток 540 А, гарантия 2 года. Подбор по марке авто."
  },
  {
    id: "7",
    sku: "CL-FEB-007",
    name: "Тормозная жидкость DOT 4 (1 л)",
    brand: "Febi Bilstein",
    car: "Универсальная",
    price: 450,
    inStock: 24,
    image: "/images/brake-fluid.jpg",
    description: "Соответствует DOT 4, подходит для большинства легковых авто."
  },
  {
    id: "8",
    sku: "RAD-DENSO-008",
    name: "Радиатор охлаждения",
    brand: "Denso",
    car: "Chevrolet Captiva (2006–2018)",
    price: 12500,
    inStock: 3,
    image: "/images/radiator.jpg",
    description: "Оригинальное качество, алюминиевый, с патрубками."
  }
];