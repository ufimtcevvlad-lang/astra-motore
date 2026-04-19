/** Строка технической характеристики — пара «название → значение». */
export type ProductSpec = {
  label: string;
  value: string;
};

/**
 * Расширенное SEO-описание товара: функция в автомобиле, признаки износа,
 * регламент замены, особенности установки. Все поля опциональны —
 * показываем только то, что заполнено.
 */
export type ProductLongDescription = {
  /** Что делает эта деталь в автомобиле, её назначение. */
  purpose?: string;
  /** Признаки износа / по каким симптомам понять что пора менять. */
  symptoms?: string;
  /** Регламент замены (пробег, срок, условия). */
  interval?: string;
  /** Особенности установки, что учесть при монтаже. */
  install?: string;
};

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
  /** Дополнительные фото товара (обложка = `image` = первый кадр `images[]`; порядок: деталь/ракурсы → коробка/упаковка → артикул на этикетке) */
  images?: string[];
  description: string;
  /** Ссылки на аналоги из того же каталога */
  analogIds?: string[];
  /** Технические характеристики (таблица на карточке товара). */
  specs?: ProductSpec[];
  /** Расширенное SEO-описание с разбивкой по разделам. */
  longDescription?: ProductLongDescription;
};
