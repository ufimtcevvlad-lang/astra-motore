import { CATEGORY_RULES } from "../../data/category-rules";

/**
 * Возвращает sectionSlug первого совпадения или null.
 */
export function detectCategory(name: string): string | null {
  const lower = name.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.sectionSlug;
    }
  }
  return null;
}
