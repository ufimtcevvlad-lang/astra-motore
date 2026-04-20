import { SITE_URL } from "./site";

/**
 * "Чистые" параметры каталога — сохраняются в canonical, эти комбинации считаем
 * ценными посадочными (бренд запчасти, марка авто, раздел каталога).
 * Сортировка ключей детерминированная, чтобы `?a=1&b=2` === `?b=2&a=1`.
 */
const CLEAN_PARAMS = ["brand", "car", "section"] as const;

type ParamBag = Record<string, string | string[] | undefined>;

function firstStr(raw: string | string[] | undefined): string | null {
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

/**
 * Возвращает канонический URL для /catalog с учётом фильтров:
 * - оставляет только CLEAN_PARAMS (section, car, одиночный brand);
 * - бренд с запятыми (несколько значений) → canonical на /catalog (тонкая комбинация);
 * - мусорные параметры (q, sort, priceFrom/To, inStock, page) отбрасываются.
 */
export function buildCatalogCanonical(searchParams: ParamBag): string {
  const clean = new URLSearchParams();
  for (const key of CLEAN_PARAMS) {
    const val = firstStr(searchParams[key]);
    if (!val) continue;
    if (key === "brand" && val.includes(",")) continue;
    clean.set(key, val);
  }
  const qs = clean.toString();
  return qs ? `${SITE_URL}/catalog?${qs}` : `${SITE_URL}/catalog`;
}

/**
 * Формирует SEO-заголовок и описание для фильтровой версии /catalog.
 * Возвращает null, если параметров нет — используем дефолтный title.
 */
export function buildCatalogSeoFromParams(searchParams: ParamBag): {
  title: string;
  description: string;
} | null {
  const brand = firstStr(searchParams.brand);
  const car = firstStr(searchParams.car);
  const section = firstStr(searchParams.section);

  const parts: string[] = [];
  if (section) parts.push(section);
  if (car && car !== "all") parts.push(`для ${car.charAt(0).toUpperCase()}${car.slice(1)}`);
  if (brand && !brand.includes(",")) parts.push(brand);

  if (parts.length === 0) return null;
  const title = `${parts.join(" ")} — каталог запчастей`;
  const description = `Подборка запчастей: ${parts.join(", ")}. Оригинал и аналоги, доставка по Екатеринбургу.`;
  return { title, description };
}
