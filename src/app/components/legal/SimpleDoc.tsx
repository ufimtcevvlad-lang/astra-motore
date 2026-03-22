import type { ReactNode } from "react";

/** Короткая текстовая страница (о компании, юр. блоки). */
export function SimpleDoc({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <div className="mt-6 text-slate-700 leading-relaxed space-y-4">{children}</div>
    </article>
  );
}
