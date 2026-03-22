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
    <header className="space-y-2 border-b border-slate-200/90 pb-5">
      <nav
        className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-500"
        aria-label="Хлебные крошки"
      >
        {crumbs.map((c, i) => (
          <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300 select-none" aria-hidden>/</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-amber-700 transition">
                {c.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-800">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
      {description ? (
        <div className="max-w-xl text-sm leading-relaxed text-slate-600">{description}</div>
      ) : null}
    </header>
  );
}
