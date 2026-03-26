"use client";

import Link from "next/link";
import { CATALOG_GROUPS, sectionsInGroup } from "../../data/catalog-sections";
import type { Product } from "../../data/products";

type BrandFilter = "all" | "opel" | "chevrolet";

function productMatchesBrand(p: Product, brand: BrandFilter): boolean {
  if (brand === "all") return true;
  const t = p.car.toLowerCase();
  if (brand === "opel") return t.includes("opel");
  return t.includes("chevrolet");
}

type CatalogGroupNavProps = {
  products: Product[];
  brandFilter: BrandFilter;
  /** Показывать только в режиме «все разделы» без поиска */
  visible: boolean;
  /** inline — лента под поиском (мобилка); sidebar — слева от сетки (десктоп) */
  variant: "inline" | "sidebar";
};

/**
 * Переходы по крупным группам каталога (схема: блок под фильтрами + боковая колонка на ПК).
 */
export function CatalogGroupNav({
  products,
  brandFilter,
  visible,
  variant,
}: CatalogGroupNavProps) {
  if (!visible) return null;

  const groupsWithItems = CATALOG_GROUPS.filter((group) => {
    const sections = sectionsInGroup(group.slug);
    return sections.some((sec) =>
      products.some((p) => p.category === sec.title && productMatchesBrand(p, brandFilter))
    );
  });

  if (groupsWithItems.length === 0) return null;

  const chipClass =
    "shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:border-amber-300 hover:bg-amber-50/80 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
  const linkClass =
    "block rounded-lg border border-transparent px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

  if (variant === "inline") {
    return (
      <div className="mt-4 border-t border-slate-100 pt-4 lg:hidden">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">К группам</p>
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 px-1">
          {groupsWithItems.map((g) => (
            <Link key={g.slug} href={`#catalog-group-${g.slug}`} className={chipClass}>
              {g.title}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start lg:w-[220px] shrink-0 space-y-1 border-r border-slate-100 pr-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Группы</p>
      <nav aria-label="Переход к группам каталога">
        {groupsWithItems.map((g) => (
          <Link key={g.slug} href={`#catalog-group-${g.slug}`} className={linkClass}>
            {g.title}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
