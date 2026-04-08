import type { ProductLongDescription as TLongDescription } from "../../../data/products";

type Props = {
  longDescription: TLongDescription;
};

const SECTIONS: Array<{ key: keyof TLongDescription; title: string }> = [
  { key: "purpose", title: "Назначение и функция" },
  { key: "symptoms", title: "Признаки износа" },
  { key: "interval", title: "Регламент замены" },
  { key: "install", title: "Особенности установки" },
];

export function ProductLongDescription({ longDescription }: Props) {
  const hasAny = SECTIONS.some((s) => Boolean(longDescription[s.key]?.trim()));
  if (!hasAny) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">
        Подробное описание
      </h2>
      {SECTIONS.map((section) => {
        const value = longDescription[section.key]?.trim();
        if (!value) return null;
        return (
          <div key={section.key} className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-800">{section.title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{value}</p>
          </div>
        );
      })}
    </section>
  );
}
