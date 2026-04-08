import type { ProductSpec } from "../../../data/products";

type Props = {
  specs: ProductSpec[];
};

export function ProductSpecs({ specs }: Props) {
  if (specs.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-3">
        Технические характеристики
      </h2>
      <dl className="divide-y divide-slate-100 text-sm">
        {specs.map((spec) => (
          <div key={spec.label} className="flex items-start justify-between gap-4 py-2">
            <dt className="text-slate-500">{spec.label}</dt>
            <dd className="text-right font-medium text-slate-900">{spec.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
