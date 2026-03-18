"use client";

import { useCart } from "../../components/CartContext";
import type { Product } from "../../data/products";

export function ProductClient({ product }: { product: Product }) {
  const { addToCart } = useCart();

  return (
    <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm border border-slate-200 h-fit">
      <p className="text-lg font-bold text-sky-600">
        {product.price.toLocaleString("ru-RU")} ₽
      </p>
      <p className="text-xs text-slate-500">
        В наличии: {product.inStock} шт.
      </p>
      <button
        onClick={() => addToCart(product)}
        className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 transition shadow-sm"
      >
        В корзину
      </button>
      <p className="text-xs text-slate-500">
        После оформления заказа менеджер свяжется с вами для подтверждения и
        подбора аналогов при необходимости.
      </p>
    </div>
  );
}

