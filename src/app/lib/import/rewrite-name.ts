import { normalizeName } from "./normalize-name";
import { detectCar } from "./detect-car";
import type { CarMake } from "../../data/car-models";

export interface RewriteResult {
  /** Финальное name для БД. */
  name: string;
  /** Поле products.car — склеенные марки+модели для фильтрации в каталоге. */
  car: string;
  /** true, если модель в имени не нашлась и марку подставить не удалось. */
  unresolved: boolean;
}

/**
 * Формула: {name с подставленной маркой перед моделью} | арт. {sku}
 *
 * Мульти-модельные кейсы:
 *   - одна марка, несколько моделей: "Opel Astra H/J" — марка ставится один раз
 *   - разные марки: "Opel Astra J/Chevrolet Cruze" — каждая пара make+model
 */
export function rewriteName(rawName: string, sku: string): RewriteResult {
  const normalized = normalizeName(rawName);
  const det = detectCar(normalized);

  let car = "";
  if (det.models.length > 0) {
    car = formatCarField(det.models);
  }

  let body = normalized;

  if (det.models.length > 0 && !det.makeAlreadyInName && det.firstModelIndex !== null) {
    body = insertMakesBeforeFirstModel(normalized, det);
  }

  const name = `${body} | арт. ${sku}`;
  const unresolved = det.models.length === 0;

  return { name, car, unresolved };
}

function formatCarField(models: { make: CarMake; canonical: string }[]): string {
  // Группируем по марке.
  const byMake = new Map<CarMake, string[]>();
  for (const m of models) {
    const list = byMake.get(m.make) ?? [];
    list.push(m.canonical);
    byMake.set(m.make, list);
  }

  const parts: string[] = [];
  for (const [make, mods] of byMake.entries()) {
    const joined = collapseModels(mods);
    parts.push(`${make} ${joined}`);
  }
  return parts.join("/");
}

/**
 * «Astra H, Astra J» → «Astra H/J» когда общий корень.
 * Иначе — через «/».
 */
function collapseModels(models: string[]): string {
  if (models.length === 1) return models[0];
  const first = models[0];
  const prefix = first.split(" ")[0];
  const allSamePrefix = models.every((m) => m.startsWith(prefix + " ") || m === prefix);
  if (allSamePrefix) {
    const suffixes = models.map((m) => m.slice(prefix.length).trim()).filter(Boolean);
    return `${prefix} ${suffixes.join("/")}`;
  }
  return models.join("/");
}

function insertMakesBeforeFirstModel(
  normalized: string,
  det: ReturnType<typeof detectCar>,
): string {
  const idx = det.firstModelIndex!;
  const prefix = normalized.slice(0, idx).trimEnd();
  const rest = normalized.slice(idx);

  // Все модели — группируем по марке и собираем подобно car-полю, но с учётом того,
  // что модели ДОЛЖНЫ быть оставлены в строке (rest уже содержит их текстово),
  // поэтому здесь подставляем только марку. Для мульти-марочных:
  // "Cruze/Astra J" → "Chevrolet Cruze/Opel Astra J" — перезапишем rest.
  if (det.makes.length === 1) {
    return `${prefix} ${det.makes[0]} ${rest}`.replace(/\s+/g, " ").trim();
  }

  // Мульти-марочный кейс: нужно заменить сам кусок с моделями.
  // Находим верхнюю границу куска моделей — берём от firstModelIndex до пробела после последней модели.
  // Проще: заменить известные алиасы внутри rest на `{make} {canonical}`.
  let rewrittenRest = rest;
  for (const m of det.models) {
    // Берём оригинальный алиас, который сработал. Не самый оптимальный подход,
    // но достаточный: ищем canonical в rest (после normalizeName дефисы уже заменены).
    const re = new RegExp(`\\b${m.canonical.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    rewrittenRest = rewrittenRest.replace(re, `${m.make} ${m.canonical}`);
  }
  // Склейки моделей через «/» уже есть в rest — «Cruze/Astra J» станет «Chevrolet Cruze/Opel Astra J».
  return `${prefix} ${rewrittenRest}`.replace(/\s+/g, " ").trim();
}
