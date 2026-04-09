import Link from "next/link";

type HomeCategoryCardProps = {
  title: string;
  priceFrom?: number;
  href: string;
  illustration: React.ReactNode;
  /** Вариант визуального оформления карточки. */
  variant?: "rect" | "medallion";
};

/** Карточка категории для блока "Популярные расходники" на главной. */
export function HomeCategoryCard({
  title,
  priceFrom,
  href,
  illustration,
  variant = "rect",
}: HomeCategoryCardProps) {
  if (variant === "medallion") {
    return (
      <Link
        href={href}
        className="group/cat flex flex-col items-center gap-3 focus:outline-none"
      >
        <div className="relative h-32 w-32 overflow-hidden rounded-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 shadow-xl ring-1 ring-slate-700/50 transition-all duration-200 group-hover/cat:-translate-y-1 group-hover/cat:ring-amber-400/60 group-hover/cat:shadow-amber-900/40 sm:h-36 sm:w-36">
          <div className="absolute inset-3 flex items-center justify-center">{illustration}</div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900 group-hover/cat:text-amber-700">{title}</p>
          {priceFrom !== undefined ? (
            <p className="mt-0.5 text-xs text-slate-500">от {priceFrom.toLocaleString("ru-RU")} ₽</p>
          ) : null}
        </div>
      </Link>
    );
  }

  // rect (default)
  return (
    <Link
      href={href}
      className="group/cat flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-400/70 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
    >
      <div className="relative flex aspect-square items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6">
        {illustration}
      </div>
      <div className="border-t border-slate-100 bg-white px-4 py-3">
        <p className="text-sm font-semibold leading-snug text-slate-900 group-hover/cat:text-amber-700">
          {title}
        </p>
        {priceFrom !== undefined ? (
          <p className="mt-1 text-xs font-medium text-slate-500">
            от <span className="text-amber-600">{priceFrom.toLocaleString("ru-RU")} ₽</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
