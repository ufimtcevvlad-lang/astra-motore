"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "../../components/CartContext";
import { useFavorites } from "../../components/FavoritesContext";
import type { Product } from "../../data/products";

export function ProductClient({ product }: { product: Product }) {
  const { addToCart, items, setItemQuantity } = useCart();
  const { isFavorite, toggle: toggleFavorite } = useFavorites();
  const [qty, setQty] = useState(1);
  const liked = isFavorite(product.id);

  const handleAddToCart = () => {
    const existing = items.find((i) => i.product.id === product.id);
    if (existing) {
      setItemQuantity(product.id, existing.quantity + qty);
    } else {
      addToCart(product);
      if (qty > 1) setItemQuantity(product.id, qty);
    }
    setQty(1);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-white p-6 shadow-md h-fit md:sticky md:top-24">
      {/* Цена + Избранное */}
      <div className="flex items-center justify-between">
        <p className="text-3xl font-bold text-slate-900 tracking-tight">
          {product.price.toLocaleString("ru-RU")}{" "}
          <span className="text-xl font-semibold text-slate-500">₽</span>
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          aria-label={liked ? "Убрать из избранного" : "В избранное"}
          className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
            liked
              ? "bg-red-50 text-red-500"
              : "bg-slate-100 text-slate-400 hover:text-red-400"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
      </div>

      {/* Наличие */}
      <p className="text-[11px] text-slate-400">
        В наличии: {product.inStock} шт.
      </p>

      {/* Количество + В корзину */}
      <div className="flex items-center gap-3">
        <div className="inline-flex items-center border border-slate-200 rounded-xl">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            className="flex h-10 w-10 items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-xl transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Уменьшить количество"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className="w-10 text-center text-sm font-medium tabular-nums select-none">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(product.inStock, q + 1))}
            disabled={qty >= product.inStock}
            className="flex h-10 w-10 items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-xl transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Увеличить количество"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleAddToCart}
          className="flex-1 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-amber-700 hover:shadow-lg hover:shadow-amber-600/25 active:scale-[0.98]"
        >
          В корзину
        </button>
      </div>

      {/* Дисклеймер */}
      <p className="text-xs text-slate-500">
        После оформления заказа менеджер свяжется с вами для подтверждения и
        подбора аналогов при необходимости.
      </p>

      {/* Доставка / Гарантия / Возврат */}
      <div className="border-t border-slate-100 pt-4 mt-1 space-y-2.5">
        <Link
          href="/dostavka-zapchastey-ekaterinburg"
          className="flex items-center gap-2 text-xs text-slate-600 hover:text-amber-600 transition group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-slate-400 shrink-0 group-hover:text-amber-500 transition">
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <path d="M16 8h4l3 3v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <span>Доставка по Екатеринбургу</span>
          <span className="ml-auto text-amber-600 opacity-0 group-hover:opacity-100 transition">→</span>
        </Link>

        <Link
          href="/warranty"
          className="flex items-center gap-2 text-xs text-slate-600 hover:text-amber-600 transition group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-slate-400 shrink-0 group-hover:text-amber-500 transition">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Гарантия на все товары</span>
          <span className="ml-auto text-amber-600 opacity-0 group-hover:opacity-100 transition">→</span>
        </Link>

        <Link
          href="/returns"
          className="flex items-center gap-2 text-xs text-slate-600 hover:text-amber-600 transition group"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-slate-400 shrink-0 group-hover:text-amber-500 transition">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
          <span>Возврат и обмен</span>
          <span className="ml-auto text-amber-600 opacity-0 group-hover:opacity-100 transition">→</span>
        </Link>
      </div>

      {/* Бейджи доверия */}
      <div className="border-t border-slate-100 pt-3 flex items-center justify-center gap-4 text-[11px] text-slate-400">
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
          Гарантия возврата
        </span>
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          Доставка по Екб
        </span>
      </div>

      {/* Контакт */}
      <p className="text-center text-[11px] text-slate-400">
        Есть вопросы?{" "}
        <a
          href="https://wa.me/79022540111"
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-600 hover:underline"
        >
          Напишите нам
        </a>
      </p>
    </div>
  );
}
