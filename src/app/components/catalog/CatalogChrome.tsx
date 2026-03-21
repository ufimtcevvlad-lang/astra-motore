import Link from "next/link";
import type { ReactNode } from "react";

export type CatalogCrumb = { label: string; href?: string };

/**
 * Единый «шапочный» блок: крошки + H1 + вводный текст (как у крупных магазинов запчастей).
 */
export function CatalogChrome({
  crumbs,
  title,
  description,
}: {
  crumbs: CatalogCrumb[];
  title: string;
  description?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 sm:px-5 sm:py-5 shadow-sm space-y-2">
      <nav
        className="text-xs text-slate-500 flex flex-wrap items-center gap-x-1 gap-y-1"
        aria-label="Хлебные крошки"
      >
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300 select-none">/</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-amber-700 transition">
                {c.label}
              </Link>
            ) : (
              <span className="text-slate-800 font-medium">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {description ? <div className="text-sm text-slate-600 max-w-2xl leading-relaxed">{description}</div> : null}
    </div>
  );
}
