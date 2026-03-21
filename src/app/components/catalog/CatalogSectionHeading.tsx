import type { ReactNode } from "react";

/** Единый заголовок блока внутри каталога / посадочных */
export function CatalogSectionHeading({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4 ${className}`.trim()}
    >
      {children}
    </h2>
  );
}
