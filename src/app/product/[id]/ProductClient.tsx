"use client";

import { useCart } from "../../components/CartContext";
import type { Product } from "../../data/products";

export function ProductClient({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const isOriginal = /gm|oe|ориг/i.test(product.brand);
  const stockTone =
    product.inStock > 20
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm border border-slate-200 h-fit">
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${stockTone}`}>
          {product.inStock > 20 ? "В наличии" : "Осталось мало"}
        </span>
        {isOriginal ? (
          <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900">
            Оригинал
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            Проверенный аналог
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-amber-600">
        {product.price.toLocaleString("ru-RU")} ₽
      </p>
      <p className="text-xs text-slate-500">
        В наличии: {product.inStock} шт.
      </p>
      <button
        onClick={() => addToCart(product)}
        className="w-full rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition shadow-sm"
      >
        В корзину
      </button>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">Почему безопасно заказывать у нас</p>
        <ul className="mt-2 space-y-1.5">
          <li className="flex items-center gap-2"><span className="text-amber-600">✓</span>Проверка применимости по VIN</li>
          <li className="flex items-center gap-2"><span className="text-amber-600">✓</span>Подтверждение заказа менеджером</li>
          <li className="flex items-center gap-2"><span className="text-amber-600">✓</span>Гарантия и возврат по регламенту</li>
        </ul>
      </div>
      <p className="text-xs text-slate-500">
        После оформления заказа менеджер свяжется с вами для подтверждения и
        подбора аналогов при необходимости.
      </p>
    </div>
  );
}

