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
