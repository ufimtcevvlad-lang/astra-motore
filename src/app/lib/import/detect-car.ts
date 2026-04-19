import { CAR_MODELS, MAKE_TOKENS_IN_NAME, type CarMake } from "../../data/car-models";

export interface DetectedCar {
  /** Уникальные марки, найденные по моделям. */
  makes: CarMake[];
  /** Модели в каноническом виде. */
  models: { make: CarMake; canonical: string }[];
  /** Индексы найденных моделей в исходной строке (для корректной вставки марки). */
  firstModelIndex: number | null;
  /** true, если марка уже присутствует в name (Opel/Chevrolet/GM/General Motors/Cadillac). */
  makeAlreadyInName: boolean;
}

/**
 * Ищет модели из справочника car-models в normalized name.
 * Возвращает первые вхождения каждой модели (без дублей).
 */
export function detectCar(normalizedName: string): DetectedCar {
  const lower = normalizedName.toLowerCase();

  const makeAlreadyInName = MAKE_TOKENS_IN_NAME.some((t) =>
    new RegExp(`\\b${escapeRegExp(t)}\\b`, "i").test(normalizedName),
  );

  const found: { make: CarMake; canonical: string; index: number }[] = [];
  for (const model of CAR_MODELS) {
    for (const alias of model.aliases) {
      const idx = lower.indexOf(alias.toLowerCase());
      if (idx >= 0) {
        found.push({ make: model.make, canonical: model.canonical, index: idx });
        break;
      }
    }
  }

  // Уникализируем по canonical.
  const uniqByCanonical = new Map<string, (typeof found)[number]>();
  for (const f of found) {
    const key = `${f.make}:${f.canonical}`;
    const prev = uniqByCanonical.get(key);
    if (!prev || f.index < prev.index) uniqByCanonical.set(key, f);
  }
  const models = Array.from(uniqByCanonical.values()).sort((a, b) => a.index - b.index);

  const makes = Array.from(new Set(models.map((m) => m.make)));
  const firstModelIndex = models[0]?.index ?? null;

  return {
    makes,
    models: models.map((m) => ({ make: m.make, canonical: m.canonical })),
    firstModelIndex,
    makeAlreadyInName,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
