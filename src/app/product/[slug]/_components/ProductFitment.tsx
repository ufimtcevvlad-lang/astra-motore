import type { ProductFitment as TFitment } from "../../../data/products";

type Props = {
  fitment: TFitment[];
};

export function ProductFitment({ fitment }: Props) {
  if (fitment.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-3">
        Применимость
      </h2>
      <p className="text-xs text-slate-500 mb-3">
        Список моделей и двигателей, на которых устанавливается эта деталь. Для точной подборки
        по VIN используйте форму запроса.
      </p>
      <ul className="divide-y divide-slate-100">
        {fitment.map((item, idx) => {
          const subline = [item.engine, item.years, item.body].filter(Boolean).join(" · ");
          return (
            <li key={`${item.brand}-${item.model}-${idx}`} className="py-2.5">
              <p className="text-sm font-semibold text-slate-900">
                {item.brand} {item.model}
              </p>
              {subline ? <p className="mt-0.5 text-xs text-slate-600">{subline}</p> : null}
              {item.note ? <p className="mt-0.5 text-xs text-slate-500 italic">{item.note}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
