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
    car: "Ford Focus II (2004–2011)",
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
    car: "Toyota Camry V50 (2011–2017)",
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
    car: "Renault Duster (2012–2019)",
    price: 780,
    inStock: 18,
    image: "/images/air-filter.jpg",
    description: "Увеличенный ресурс, улучшенная фильтрация воздуха."
  }
];