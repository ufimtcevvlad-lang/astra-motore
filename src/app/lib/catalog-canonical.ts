import { SITE_URL } from "./site";
import { CATALOG_SECTIONS } from "../data/catalog-sections";

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

const sectionTitleBySlug = new Map<string, string>(
  CATALOG_SECTIONS.map((section) => [section.slug, section.title]),
);

function humanSection(slug: string): string {
  return sectionTitleBySlug.get(slug) ?? slug;
}

function isKnownSection(slug: string): boolean {
  return sectionTitleBySlug.has(slug);
}

function humanCar(car: string): string {
  if (car === "opel") return "Opel";
  if (car === "chevrolet") return "Chevrolet";
  return `${car.charAt(0).toUpperCase()}${car.slice(1)}`;
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
    if (key === "section" && !isKnownSection(val)) continue;
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
  const sectionRaw = firstStr(searchParams.section);
  const section = sectionRaw && isKnownSection(sectionRaw) ? sectionRaw : null;

  const parts: string[] = [];
  if (section) parts.push(humanSection(section));
  if (car && car !== "all") parts.push(`для ${humanCar(car)}`);
  if (brand && !brand.includes(",")) parts.push(brand);

  if (parts.length === 0) return null;
  const title = `${parts.join(" ")} — каталог запчастей`;
  const description = `Подборка запчастей: ${parts.join(", ")}. Оригинал и аналоги, доставка по Екатеринбургу.`;
  return { title, description };
}
