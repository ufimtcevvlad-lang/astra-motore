"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HUB_LINKS = [
  { href: "/catalog", label: "Витрина", match: (p: string) => p === "/catalog" || p.startsWith("/product/") },
  { href: "/zapchasti-opel", label: "Opel", match: (p: string) => p === "/zapchasti-opel" },
  { href: "/zapchasti-chevrolet", label: "Chevrolet", match: (p: string) => p === "/zapchasti-chevrolet" },
  { href: "/zapchasti-gm", label: "GM", match: (p: string) => p === "/zapchasti-gm" },
] as const;

/**
 * Второй уровень навигации как у конкурентов: «Каталоги → витрина / марки».
 */
export function CatalogHubStrip() {
  const pathname = usePathname() || "";

  return (
    <div className="border-t border-slate-800/90 bg-[#030712]/95">
      <div className="mx-auto max-w-5xl px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 shrink-0">
          Каталоги
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {HUB_LINKS.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1 text-[11px] sm:text-xs font-medium transition border ${
                  active
                    ? "border-amber-400 bg-amber-400/15 text-amber-300"
                    : "border-slate-700 text-slate-400 hover:border-amber-500/50 hover:text-amber-200"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
