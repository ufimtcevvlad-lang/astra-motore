import type { Metadata } from "next";
import { HomeCategoryCard } from "../../components/home/HomeCategoryCard";
import {
  AirFilterArt,
  CabinFilterArt,
  GasketArt,
  OilFilterArt,
  SparkPlugArt,
  TimingBeltArt,
} from "../../components/home/HomeCategoryIllustrations";
import { products } from "../../data/products";

export const metadata: Metadata = {
  title: "Превью блоков главной",
  robots: { index: false, follow: false },
};

/** Минимальная цена товара в категории по полю Product.category. */
function minPriceByCategory(categoryTitle: string): number | undefined {
  const filtered = products.filter((p) => p.category === categoryTitle);
  if (filtered.length === 0) return undefined;
  return Math.min(...filtered.map((p) => p.price));
}

type CatDef = {
  title: string;
  sectionTitle: string;
  href: string;
  Art: React.FC<{ className?: string }>;
};

const CATEGORIES: CatDef[] = [
  {
    title: "Свечи зажигания",
    sectionTitle: "Свечи и зажигание",
    href: "/catalog?section=svechi",
    Art: SparkPlugArt,
  },
  {
    title: "Масляные фильтры",
    sectionTitle: "Масляные фильтры",
    href: "/catalog?section=filtry",
    Art: OilFilterArt,
  },
  {
    title: "Воздушные фильтры",
    sectionTitle: "Воздушные фильтры",
    href: "/catalog?section=filtry-vozdushnye",
    Art: AirFilterArt,
  },
  {
    title: "Салонные фильтры",
    sectionTitle: "Салонные фильтры",
    href: "/catalog?section=filtry-salon",
    Art: CabinFilterArt,
  },
  {
    title: "Прокладки и сальники",
    sectionTitle: "Прокладки, сальники и кольца",
    href: "/catalog?section=prokladki",
    Art: GasketArt,
  },
  {
    title: "Комплект ГРМ",
    sectionTitle: "Двигатель",
    href: "/catalog?section=dvigatel",
    Art: TimingBeltArt,
  },
];

export default function HomeBlocksPreview() {
  return (
    <div className="space-y-14 py-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Превью блоков главной — категории</h1>
        <p className="mt-2 text-sm text-slate-600">
          Временная страница для утверждения дизайна блока «Популярные расходники». Все иллюстрации
          сгенерированы в коде (SVG с заливкой и градиентами), реальные фото не используются.
        </p>
      </div>

      {/* ============================================================ */}
      {/* Вариант 1 — Прямоугольные карточки (классика магазина) */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Вариант 1 · Прямоугольные карточки + цена «от»
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Классика интернет-магазина. Фото категории, название и цена «от». Самый «продающий».
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map(({ title, sectionTitle, href, Art }) => (
            <HomeCategoryCard
              key={title}
              title={title}
              priceFrom={minPriceByCategory(sectionTitle)}
              href={href}
              illustration={<Art className="h-full w-full max-h-32 max-w-32" />}
              variant="rect"
            />
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* Вариант 2 — Круглые медальоны */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Вариант 2 · Круглые медальоны</h2>
          <p className="mt-1 text-sm text-slate-500">
            Премиум-эстетика. Тёмная круглая рамка, внутри иллюстрация. Меньше текста.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 rounded-2xl border border-slate-100 bg-slate-50 p-8">
          {CATEGORIES.map(({ title, sectionTitle, href, Art }) => (
            <HomeCategoryCard
              key={title}
              title={title}
              priceFrom={minPriceByCategory(sectionTitle)}
              href={href}
              illustration={<Art className="h-full w-full" />}
              variant="medallion"
            />
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* Вариант 3 — Горизонтальная лента (scroll-snap) */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Вариант 3 · Горизонтальная лента со скроллом
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            На мобильном — свайп пальцем. Хорош если категорий будет 10+. На 6 листается слабо.
          </p>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-4">
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 scroll-pl-4">
            {CATEGORIES.map(({ title, sectionTitle, href, Art }) => (
              <div key={title} className="w-52 flex-shrink-0 snap-start">
                <HomeCategoryCard
                  title={title}
                  priceFrom={minPriceByCategory(sectionTitle)}
                  href={href}
                  illustration={<Art className="h-full w-full max-h-32 max-w-32" />}
                  variant="rect"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Большие иллюстрации — чтобы видеть детализацию */}
      {/* ============================================================ */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Иллюстрации крупно (для проверки деталей)
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Так выглядят сами SVG-картинки. Если какая-то не нравится — скажи, перерисую.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 rounded-2xl border border-slate-100 bg-white p-8 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map(({ title, Art }) => (
            <div key={title} className="flex flex-col items-center gap-3">
              <Art className="h-40 w-40" />
              <p className="text-center text-sm font-medium text-slate-700">{title}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
