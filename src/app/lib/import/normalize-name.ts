import { CAR_MODELS, TYPO_FIXES } from "../../data/car-models";

/**
 * Нормализация: исправление опечаток 1С + замена дефиса на пробел в моделях.
 * Возвращает новое name.
 */
export function normalizeName(raw: string): string {
  let s = raw;

  // Применяем опечатки из справочника.
  for (const [from, to] of Object.entries(TYPO_FIXES)) {
    s = s.replaceAll(from, to);
  }

  // Для каждой модели: если встречается вариант с дефисом, заменяем на без дефиса.
  for (const model of CAR_MODELS) {
    for (const alias of model.aliases) {
      if (alias.includes("-")) {
        const noDash = alias.replace("-", " ");
        s = s.replaceAll(alias, noDash);
      }
    }
  }

  // Сжимаем лишние пробелы.
  s = s.replace(/\s+/g, " ").trim();

  return s;
}
