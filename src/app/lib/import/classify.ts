import { NON_GM_MARKERS } from "../../data/non-gm-markers";

export type RejectReason = "non-gm";

/**
 * Возвращает причину отбраковки или null, если позиция проходит фильтр.
 * Фильтр жидкостей/химии отключён: пользователь сам курирует прайс.
 */
export function classify(name: string, brand: string): RejectReason | null {
  const haystack = `${name} ${brand}`.toLowerCase();

  for (const token of NON_GM_MARKERS) {
    const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, "i");
    if (re.test(haystack)) return "non-gm";
  }
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
