import Link from "next/link";
import {
  AirFilterIcon,
  CabinFilterIcon,
  EngineIcon,
  GasketIcon,
  OilFilterIcon,
  SparkPlugIcon,
} from "../icons/CategoryIcons";
import { products } from "../../data/products";

type CategoryDef = {
  title: string;
  sectionTitle: string;
  href: string;
  Icon: React.FC<{ className?: string }>;
  badge?: string;
};

const CATEGORIES: CategoryDef[] = [
  {
    title: "Свечи зажигания",
    sectionTitle: "Свечи и зажигание",
    href: "/catalog?section=svechi",
    Icon: SparkPlugIcon,
    badge: "Bosch, NGK, GM OE",
  },
  {
    title: "Масляные фильтры",
    sectionTitle: "Масляные фильтры",
    href: "/catalog?section=filtry",
    Icon: OilFilterIcon,
    badge: "Hengst, Filtron, Mahle",
  },
  {
    title: "Воздушные фильтры",
    sectionTitle: "Воздушные фильтры",
    href: "/catalog?section=filtry-vozdushnye",
    Icon: AirFilterIcon,
  },
  {
    title: "Салонные фильтры",
    sectionTitle: "Салонные фильтры",
    href: "/catalog?section=filtry-salon",
    Icon: CabinFilterIcon,
  },
  {
    title: "Прокладки и сальники",
    sectionTitle: "Прокладки, сальники и кольца",
    href: "/catalog?section=prokladki",
    Icon: GasketIcon,
    badge: "Elring, GM OE",
  },
  {
    title: "Двигатель",
    sectionTitle: "Двигатель",
    href: "/catalog?section=dvigatel",
    Icon: EngineIcon,
    badge: "INA, KS, Kolbenschmidt",
  },
];

function minPriceInCategory(categoryTitle: string): number | undefined {
  const filtered = products.filter((p) => p.category === categoryTitle);
  if (filtered.length === 0) return undefined;
  return Math.min(...filtered.map((p) => p.price));
}

function countInCategory(categoryTitle: string): number {
  return products.filter((p) => p.category === categoryTitle).length;
}

/** Блок «Популярные расходники» — крупные амбер-карточки категорий с иконками. */
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
        {CATEGORIES.map(({ title, sectionTitle, href, Icon, badge }) => {
          const priceFrom = minPriceInCategory(sectionTitle);
          const count = countInCategory(sectionTitle);
          return (
            <Link
              key={title}
              href={href}
              className="group/cat flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/70 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            >
              <div className="relative flex items-center justify-center bg-gradient-to-br from-amber-50 via-amber-100/40 to-white py-10">
                <Icon className="h-24 w-24 text-amber-500 transition-transform duration-300 group-hover/cat:scale-110" />
                {count > 0 ? (
                  <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-700 shadow-sm">
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
