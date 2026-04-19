import Image from "next/image";
import type { Product } from "../../lib/products-types";

type Props = {
  product: Product;
  quantity: number;
  onIncrease: (id: string) => void;
  onDecrease: (id: string) => void;
  onSetQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
};

export function CartItemRow({ product, quantity, onIncrease, onDecrease, onSetQuantity, onRemove }: Props) {
  return (
    <article className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="absolute inset-1.5">
          <Image
            src={product.image}
            alt={`${product.name}, арт. ${product.sku}`}
            fill
            sizes="80px"
            className="object-contain object-center"
          />
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="line-clamp-2 text-sm font-semibold text-slate-900 sm:text-base">{product.name}</p>
        <p className="text-xs text-slate-500">
          Арт. {product.sku} · {product.brand}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => onDecrease(product.id)}
              className="inline-flex h-11 w-11 items-center justify-center text-lg text-slate-700 hover:bg-slate-50"
              aria-label="Уменьшить количество"
            >
              −
            </button>
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={quantity}
              onChange={(e) => {
                const nextValue = Number.parseInt(e.target.value, 10);
                if (Number.isNaN(nextValue)) return;
                onSetQuantity(product.id, Math.max(1, nextValue));
              }}
              onBlur={(e) => {
                const nextValue = Number.parseInt(e.target.value, 10);
                onSetQuantity(product.id, Number.isNaN(nextValue) ? 1 : Math.max(1, nextValue));
              }}
              className="h-11 w-14 border-x border-slate-200 bg-white px-1 text-center text-sm font-medium text-slate-900 [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-amber-200 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label="Количество товара"
            />
            <button
              type="button"
              onClick={() => onIncrease(product.id)}
              className="inline-flex h-11 w-11 items-center justify-center text-lg text-slate-700 hover:bg-slate-50"
              aria-label="Увеличить количество"
            >
              +
            </button>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">{product.price.toLocaleString("ru-RU")} ₽ / шт.</p>
            <p className="text-base font-semibold text-amber-700">
              {(product.price * quantity).toLocaleString("ru-RU")} ₽
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          className="text-xs font-medium text-red-700 hover:underline"
        >
          Удалить
        </button>
      </div>
    </article>
  );
}
