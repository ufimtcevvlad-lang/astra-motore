import { products, type Product } from "../data/products";

/** Транслитерация кириллицы → латиница (ГОСТ 7.79-2000 Б, упрощённая). */
const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function transliterate(s: string): string {
  return s
    .toLowerCase()
    .split("")
    .map((c) => TRANSLIT[c] ?? c)
    .join("");
}

/** Латиница + цифры для сегментов URL. */
function slugifySegment(s: string): string {
  return transliterate(s)
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Извлекает тип детали из названия (первые 1-3 слова до бренда/кода мотора). */
function extractPartType(name: string): string {
  // Берём часть до «|» (артикула), потом до первого бренда в верхнем регистре или кода мотора
  const clean = name.split("|")[0].trim();
  // Отсекаем всё начиная с бренда (BOSCH, HENGST, SIBTEK и т.д.) или кода мотора (A16XER, Z18XER, F16D4)
  const cutoff = clean.search(/\b[A-Z]{2,}[a-z]*\b|\b[A-Z]\d{2}[A-Z]/);
  const raw = cutoff > 0 ? clean.slice(0, cutoff).trim() : clean;
  // Максимум 5 слов для slug
  const words = raw.split(/\s+/).slice(0, 5);
  return words.join(" ").replace(/[,()]/g, "").trim();
}

function baseProductSlug(product: Product): string {
  const partType = slugifySegment(extractPartType(product.name));
  const b = slugifySegment(product.brand) || "brand";
  const k = slugifySegment(product.sku) || "sku";
  // svecha-zazhiganiya-bosch-0242229699
  return partType ? `${partType}-${b}-${k}` : `${b}-${k}`;
}

function assignSlugs(list: Product[]): {
  idToSlug: Map<string, string>;
  slugToProduct: Map<string, Product>;
} {
  const sorted = [...list].sort((a, b) => a.id.localeCompare(b.id, "en"));
  const slugToProduct = new Map<string, Product>();
  const idToSlug = new Map<string, string>();

  for (const p of sorted) {
    const base = baseProductSlug(p);
    let slug = base;
    if (slugToProduct.has(slug)) {
      slug = `${base}-${slugifySegment(p.id) || "item"}`;
    }
    let n = 2;
    while (slugToProduct.has(slug)) {
      slug = `${base}-${slugifySegment(p.id) || "item"}-${n}`;
      n += 1;
    }
    slugToProduct.set(slug, p);
    idToSlug.set(p.id, slug);
  }

  return { idToSlug, slugToProduct };
}

const { idToSlug, slugToProduct } = assignSlugs(products);

export function getProductSlug(product: Product): string {
  return idToSlug.get(product.id) ?? baseProductSlug(product);
}

export function getProductBySlug(slug: string): Product | undefined {
  return slugToProduct.get(slug);
}

export function productPath(product: Product): string {
  return `/product/${getProductSlug(product)}`;
}

/** Постоянные редиректы со старых URL `/product/:id` и `/product/{brand}-{sku}` на канонические slug. */
export function getLegacyProductRedirects(): Array<{
  source: string;
  destination: string;
  permanent: true;
}> {
  const redirects: Array<{ source: string; destination: string; permanent: true }> = [];
  const permanent = true as const;
  for (const p of products) {
    const dest = productPath(p);
    // Редирект с /product/{id}
    redirects.push({ source: `/product/${p.id}`, destination: dest, permanent });
    // Редирект со старого формата {brand}-{sku} (без типа детали)
    const oldSlug = `${slugifySegment(p.brand) || "brand"}-${slugifySegment(p.sku) || "sku"}`;
    if (`/product/${oldSlug}` !== dest) {
      redirects.push({ source: `/product/${oldSlug}`, destination: dest, permanent });
    }
  }
  return redirects;
}

/**
 * После слияния фото: карточки opel-111–opel-115 удалены, снимки на opel-27/37/38/44/51.
 * Старые slug и прямые ссылки /product/opel-11x ведём на канонический URL.
 */
export function getRemovedDuplicateProductRedirects(): Array<{
  source: string;
  destination: string;
  permanent: true;
}> {
  const to = (id: string): string => {
    const p = products.find((x) => x.id === id);
    return p ? productPath(p) : "/";
  };
  const permanent = true as const;
  return [
    { source: "/product/opel-111", destination: to("opel-37"), permanent },
    { source: "/product/opel-112", destination: to("opel-38"), permanent },
    { source: "/product/opel-113", destination: to("opel-27"), permanent },
    { source: "/product/opel-114", destination: to("opel-44"), permanent },
    { source: "/product/opel-115", destination: to("opel-51"), permanent },
    { source: "/product/gm-oe-96353007", destination: to("opel-37"), permanent },
    { source: "/product/mopar-55354563", destination: to("opel-38"), permanent },
    { source: "/product/opel-oe-24583232", destination: to("opel-44"), permanent },
    { source: "/product/gm-oe-55559352", destination: to("opel-51"), permanent },
    { source: "/product/gm-oe-25185121-opel-27", destination: to("opel-27"), permanent },
    /** opel-46: sku на фото/коробке ZFR6U9 вместо внутреннего 90318 */
    { source: "/product/ngk-90318", destination: to("opel-46"), permanent },
  ];
}
