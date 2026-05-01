import Image from "next/image";
import Link from "next/link";
import { getAllProducts } from "../../lib/products-db";
import { watermarkedImageUrl } from "../../lib/watermark-images";

type CategoryDef = {
  title: string;
  sectionTitle: string;
  href: string;
  coverImage: string;
  badge?: string;
};

/**
 * Обложки категорий — реальные фото товаров из каталога.
 * Выбраны снимки, которые хорошо читаются в маленьком размере:
 * сам товар крупно, без коробки или на простом фоне.
 */
const CATEGORIES: CategoryDef[] = [
  {
    title: "Свечи зажигания",
    sectionTitle: "Свечи и зажигание",
    href: "/catalog?section=svechi",
    coverImage: "/images/catalog/opel-1/01-spark.webp",
    badge: "Bosch, NGK, GM OE",
  },
  {
    title: "Масляные фильтры",
    sectionTitle: "Масляные фильтры",
    href: "/catalog?section=filtry",
    coverImage: "/images/catalog/opel-4/03-filter.webp",
    badge: "Hengst, Filtron, Mahle",
  },
  {
    title: "Воздушные фильтры",
    sectionTitle: "Воздушные фильтры",
    href: "/catalog?section=filtry-vozdushnye",
    coverImage: "/images/catalog/opel-21/03-top.webp",
  },
  {
    title: "Салонные фильтры",
    sectionTitle: "Салонные фильтры",
    href: "/catalog?section=filtry-salon",
    coverImage: "/images/catalog/opel-25/03-pleats.webp",
  },
  {
    title: "Прокладки и сальники",
    sectionTitle: "Прокладки, сальники и кольца",
    href: "/catalog?section=prokladki",
    coverImage: "/images/catalog/opel-16/01-packaging.webp",
    badge: "Elring, GM OE",
  },
  {
    title: "Комплект ГРМ",
    sectionTitle: "Двигатель",
    href: "/catalog?section=dvigatel",
    coverImage: "/images/catalog/opel-107/04-timing-belt.webp",
    badge: "INA / Schaeffler",
  },
];

function minPriceInCategory(categoryTitle: string): number | undefined {
  const filtered = getAllProducts().filter((p) => p.category === categoryTitle);
  if (filtered.length === 0) return undefined;
  return Math.min(...filtered.map((p) => p.price));
}

function countInCategory(categoryTitle: string): number {
  return getAllProducts().filter((p) => p.category === categoryTitle).length;
}

/** Блок «Популярные расходники» — карточки категорий с реальными фото товаров. */
export function HomePopularCategories() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Популярные расходники</h2>
          <p className="mt-2 text-sm text-slate-600">Всё для планового ТО Opel и Chevrolet</p>
        </div>
        <Link
          href="/catalog"
          className="self-start text-sm font-semibold text-amber-700 hover:text-amber-800 hover:underline sm:self-auto"
        >
          Смотреть весь каталог →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map(({ title, sectionTitle, href, coverImage, badge }) => {
          const priceFrom = minPriceInCategory(sectionTitle);
          const count = countInCategory(sectionTitle);
          return (
            <Link
              key={title}
              href={href}
              className="group/cat flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/70 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-50">
                <div className="absolute inset-6 flex items-center justify-center">
                  <div className="relative h-full w-full">
                    <Image
                      src={watermarkedImageUrl(coverImage, "card")}
                      alt={title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-contain object-center transition-transform duration-300 group-hover/cat:scale-105"
                    />
                  </div>
                </div>
                {count > 0 ? (
                  <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
                    {count} поз.
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col border-t border-slate-100 bg-white px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900 group-hover/cat:text-amber-700">
                  {title}
                </h3>
                {badge ? <p className="mt-1 text-xs text-slate-500">{badge}</p> : null}
                <div className="mt-auto pt-3">
                  {priceFrom !== undefined ? (
                    <p className="text-sm font-semibold text-slate-900">
                      от{" "}
                      <span className="text-amber-600">
                        {priceFrom.toLocaleString("ru-RU")} ₽
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400">Уточняйте наличие</p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
