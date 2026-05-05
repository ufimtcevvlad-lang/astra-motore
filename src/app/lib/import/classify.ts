import { NON_GM_MARKERS } from "../../data/non-gm-markers";

export type RejectReason = "non-gm";

const GM_MARKERS = ["general motors", "gm", "opel", "chevrolet", "cadillac", "buick", "daewoo"] as const;

/**
 * Возвращает причину отбраковки или null, если позиция проходит фильтр.
 * Фильтр жидкостей/химии отключён: пользователь сам курирует прайс.
 */
export function classify(name: string, brand: string): RejectReason | null {
  const haystack = `${name} ${brand}`.toLowerCase();

  // Явное упоминание GM/Opel/Chevrolet сильнее общего стоп-словаря.
  // Иначе нормальные позиции вроде Chevrolet Tahoe или Opel Astra могли
  // случайно улететь в не-GM при конфликтных словах в названии.
  for (const token of GM_MARKERS) {
    const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, "i");
    if (re.test(haystack)) return null;
  }

  for (const token of NON_GM_MARKERS) {
    const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, "i");
    if (re.test(haystack)) return "non-gm";
  }
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
