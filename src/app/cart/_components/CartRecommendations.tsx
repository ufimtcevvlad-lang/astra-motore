import Image from "next/image";
import type { Product } from "../../lib/products-types";

type Props = {
  products: Product[];
  onAdd: (product: Product) => void;
};

export function CartRecommendations({ products, onAdd }: Props) {
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {products.map((p) => (
        <article key={p.id} className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="relative mb-2 aspect-square overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="absolute inset-2">
              <Image
                src={p.image}
                alt={`${p.name}, арт. ${p.sku}`}
                fill
                sizes="(max-width: 1024px) 50vw, 25vw"
                className="object-contain object-center"
              />
            </div>
          </div>
          <p className="line-clamp-2 min-h-10 text-sm font-medium text-slate-800">{p.name}</p>
          <p className="mt-1 text-sm font-semibold text-amber-700">{p.price.toLocaleString("ru-RU")} ₽</p>
          <button
            type="button"
            onClick={() => onAdd(p)}
            className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            Добавить
          </button>
        </article>
      ))}
    </div>
  );
}
