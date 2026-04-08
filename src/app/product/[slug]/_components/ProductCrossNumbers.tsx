import type { ProductCrossNumber } from "../../../data/products";

type Props = {
  crossNumbers: ProductCrossNumber[];
};

export function ProductCrossNumbers({ crossNumbers }: Props) {
  if (crossNumbers.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-3">
        Кросс-номера (OEM-аналоги)
      </h2>
      <p className="text-xs text-slate-500 mb-3">
        Эта же деталь у других производителей — можно искать по любому из этих артикулов.
      </p>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Производитель
              </th>
              <th scope="col" className="px-3 py-2 text-left font-semibold">
                Артикул
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {crossNumbers.map((row) => (
              <tr key={`${row.brand}-${row.sku}`}>
                <td className="px-3 py-2 text-slate-700">{row.brand}</td>
                <td className="px-3 py-2 font-mono text-slate-900">{row.sku}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
