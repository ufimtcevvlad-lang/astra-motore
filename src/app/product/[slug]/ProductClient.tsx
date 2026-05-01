"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "../../components/CartContext";
import { useFavorites } from "../../components/FavoritesContext";
import type { Product } from "../../lib/products-types";
import { CopySkuButton } from "./_components/CopySkuButton";

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

  const whatsappText = encodeURIComponent(
    `Здравствуйте! Интересует ${product.name}, арт. ${product.sku}. Есть в наличии?`,
  );

  return (
    <>
    <div className="relative space-y-4 rounded-2xl bg-white p-6 shadow-md h-fit md:sticky md:top-24 overflow-hidden">
      {/* Акцентная полоска сверху */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />

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
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
      </div>

      {/* Наличие */}
      {product.inStock > 0 ? (
        product.inStock <= 3 ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-amber-600">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            Осталось {product.inStock} шт.
          </p>
        ) : (
          <p className="flex items-center gap-1 text-xs text-green-600">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
            В наличии
          </p>
        )
      ) : (
        <p className="text-sm text-slate-500">Нет в наличии</p>
      )}

      {/* Количество + В корзину */}
      {product.inStock > 0 ? (
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="flex h-10 w-10 items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-xl transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Уменьшить количество"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <span className="w-10 text-center text-sm font-medium tabular-nums select-none">
              {qty}
            </span>
            <button
              type="button"
              onClick={() =>
                setQty((q) => Math.min(product.inStock, q + 1))
              }
              disabled={qty >= product.inStock}
              className="flex h-10 w-10 items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-xl transition-colors duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Увеличить количество"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden
              >
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
      ) : (
        <a
          href={`https://wa.me/79022540111?text=${encodeURIComponent(
            `Здравствуйте! Интересует ${product.name}, арт. ${product.sku}. Когда будет в наличии?`,
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl bg-slate-100 px-5 py-3 text-center text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
        >
          Спросить о сроках
        </a>
      )}

      {/* Инфо-карточка */}
      <div className="border-t border-slate-100 pt-3">
        <dl className="divide-y divide-slate-100 text-sm">
          <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
            <dt className="text-xs text-slate-500 shrink-0">Артикул</dt>
            <dd className="font-mono font-semibold tracking-wide text-slate-900 flex items-center gap-1.5">
              {product.sku}
              <CopySkuButton sku={product.sku} />
            </dd>
          </div>
          {product.brand ? (
            <div className="flex items-baseline justify-between gap-3 py-2">
              <dt className="text-xs text-slate-500">Бренд</dt>
              <dd className="font-medium text-slate-800">{product.brand}</dd>
            </div>
          ) : null}
          {product.car ? (
            <div className="flex items-baseline justify-between gap-3 py-2 last:pb-0">
              <dt className="text-xs text-slate-500">Авто</dt>
              <dd className="text-slate-600 text-right">{product.car}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      {/* Спросить про деталь — WhatsApp */}
      <a
        href={`https://wa.me/79022540111?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-sm text-green-700 hover:text-green-800 transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Спросить про эту деталь
      </a>

      {/* Доставка / Гарантия / Возврат */}
      <div className="border-t border-slate-100 pt-4 space-y-2.5">
        <Link
          href="/dostavka-zapchastey-ekaterinburg"
          className="flex items-center gap-2 text-xs text-slate-600 hover:text-amber-600 transition group"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="text-slate-400 shrink-0 group-hover:text-amber-500 transition"
          >
            <rect x="1" y="3" width="15" height="13" rx="1" />
            <path d="M16 8h4l3 3v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <span>Доставка по Екатеринбургу и РФ</span>
          <span className="ml-auto text-amber-600 opacity-0 group-hover:opacity-100 transition">
            →
          </span>
        </Link>

        <Link
          href="/warranty"
          className="flex items-center gap-2 text-xs text-slate-600 hover:text-amber-600 transition group"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="text-slate-400 shrink-0 group-hover:text-amber-500 transition"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Гарантия на все товары</span>
          <span className="ml-auto text-amber-600 opacity-0 group-hover:opacity-100 transition">
            →
          </span>
        </Link>

        <Link
          href="/returns"
          className="flex items-center gap-2 text-xs text-slate-600 hover:text-amber-600 transition group"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="text-slate-400 shrink-0 group-hover:text-amber-500 transition"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
          <span>Возврат и обмен</span>
          <span className="ml-auto text-amber-600 opacity-0 group-hover:opacity-100 transition">
            →
          </span>
        </Link>
      </div>
    </div>
    {product.inStock > 0 ? (
      <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200 bg-white/95 px-4 py-2 shadow-[0_-10px_30px_rgba(15,23,42,0.16)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold tabular-nums text-slate-950">
              {product.price.toLocaleString("ru-RU")} ₽
            </p>
            <p className="truncate text-xs text-green-700">В наличии</p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            className="h-12 shrink-0 rounded-xl bg-amber-500 px-6 text-sm font-bold text-slate-950 shadow-md shadow-amber-900/20 active:scale-[0.98]"
          >
            В корзину
          </button>
        </div>
      </div>
    ) : null}
    </>
  );
}
