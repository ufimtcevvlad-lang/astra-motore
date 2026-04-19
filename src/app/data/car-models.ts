// Справочник моделей GM → марка.
// Используется при пост-обработке импорта из 1С: добавление марки авто в название товара.
//
// Правила формирования итогового названия:
//   - одна марка, одна модель:        "Opel Astra H"
//   - одна марка, несколько моделей:  "Opel Astra H/J"
//   - разные марки:                   "Opel Antara/Chevrolet Captiva"
//   - только коды двигателей — марку не добавлять
//   - марка уже в имени (Opel, GM, General Motors) — не дублировать
//
// aliases — все варианты написания, встречающиеся в выгрузках 1С (с дефисом и без).
// canonical — каноническая форма без дефиса.

export type CarMake = "Opel" | "Chevrolet" | "Cadillac";

export interface CarModel {
  make: CarMake;
  canonical: string;
  aliases: string[];
}

export const CAR_MODELS: CarModel[] = [
  // Opel
  { make: "Opel", canonical: "Astra G", aliases: ["Astra G", "Astra-G"] },
  { make: "Opel", canonical: "Astra H", aliases: ["Astra H", "Astra-H"] },
  { make: "Opel", canonical: "Astra J", aliases: ["Astra J", "Astra-J"] },
  { make: "Opel", canonical: "Corsa C", aliases: ["Corsa C", "Corsa-C"] },
  { make: "Opel", canonical: "Corsa D", aliases: ["Corsa D", "Corsa-D"] },
  { make: "Opel", canonical: "Insignia", aliases: ["Insignia"] },
  { make: "Opel", canonical: "Mokka", aliases: ["Mokka", "MOKKA"] },
  { make: "Opel", canonical: "Meriva", aliases: ["Meriva"] },
  { make: "Opel", canonical: "Meriva B", aliases: ["Meriva B"] },
  { make: "Opel", canonical: "Zafira A", aliases: ["Zafira A", "Zafira-A"] },
  { make: "Opel", canonical: "Zafira B", aliases: ["Zafira B", "Zafira-B"] },
  { make: "Opel", canonical: "Zafira C", aliases: ["Zafira C", "Zafira-C"] },
  { make: "Opel", canonical: "Vectra B", aliases: ["Vectra B"] },
  { make: "Opel", canonical: "Vectra C", aliases: ["Vectra C", "Vectra-C"] },
  { make: "Opel", canonical: "Omega B", aliases: ["Omega B"] },
  { make: "Opel", canonical: "Antara", aliases: ["Antara", "ANTARA"] },

  // Chevrolet
  { make: "Chevrolet", canonical: "Cruze", aliases: ["Cruze"] },
  { make: "Chevrolet", canonical: "Captiva", aliases: ["Captiva", "CAPTIVA"] },
  { make: "Chevrolet", canonical: "Lacetti", aliases: ["Lacetti"] },
  { make: "Chevrolet", canonical: "Aveo T250", aliases: ["Aveo T250", "Aveo T255", "Aveo T250/255"] },
  { make: "Chevrolet", canonical: "Aveo T300", aliases: ["Aveo T300"] },
  { make: "Chevrolet", canonical: "Cobalt", aliases: ["Cobalt"] },
  { make: "Chevrolet", canonical: "Spark M300", aliases: ["Spark M300", "Spark"] },
  { make: "Chevrolet", canonical: "Orlando", aliases: ["Orlando"] },
  { make: "Chevrolet", canonical: "Tahoe", aliases: ["Tahoe"] },

  // Cadillac
  { make: "Cadillac", canonical: "SRX", aliases: ["SRX"] },
  { make: "Cadillac", canonical: "Escalade", aliases: ["Escalade"] },
];

// Марки, которые уже могут присутствовать в имени из 1С — не дублировать.
export const MAKE_TOKENS_IN_NAME = ["Opel", "Chevrolet", "Cadillac", "GM", "General Motors"];

// Нормализации опечаток из 1С перед матчингом.
// Ключ — подстрока как в 1С, значение — чем заменить.
export const TYPO_FIXES: Record<string, string> = {
  "Corca": "Corsa",          // Corca C/D → Corsa C/D
  "CorsaMeriva": "Corsa/Meriva", // склеено без пробела
};
