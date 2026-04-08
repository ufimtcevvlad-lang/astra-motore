import type { ReactNode } from "react";

export function Widget({
  title,
  children,
  subtle = false,
}: {
  title: string;
  children: ReactNode;
  subtle?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm ${
        subtle ? "border-slate-200 bg-slate-50/60" : "border-slate-200 bg-white"
      }`}
    >
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
