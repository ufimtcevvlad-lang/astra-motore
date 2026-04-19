import { NON_GM_MARKERS } from "../../data/non-gm-markers";
import { CHEMISTRY_MARKERS } from "../../data/chemistry-markers";

export type RejectReason = "non-gm" | "chemistry";

/**
 * Возвращает причину отбраковки или null, если позиция проходит фильтр.
 */
export function classify(name: string, brand: string): RejectReason | null {
  const haystack = `${name} ${brand}`.toLowerCase();

  for (const token of NON_GM_MARKERS) {
    const re = new RegExp(`\\b${escapeRegExp(token)}\\b`, "i");
    if (re.test(haystack)) return "non-gm";
  }
  for (const token of CHEMISTRY_MARKERS) {
    if (haystack.includes(token.toLowerCase())) return "chemistry";
  }
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
