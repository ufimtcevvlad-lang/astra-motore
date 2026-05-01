"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "./CartContext";

/**
 * Плавающая кнопка корзины на мобильном — показывается только при:
 * 1. В корзине есть товары
 * 2. Пользователь прокрутил вниз (шапка не видна)
 * 3. Экран < 768px (md breakpoint)
 *
 * Позиция: левый нижний угол, чтобы не мешать FloatingContactButtons (правый нижний).
 */
export function FloatingCartButton() {
  const pathname = usePathname();
  const { items } = useCart();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 200);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  if (pathname.startsWith("/product/") || totalItems === 0 || !visible) return null;

  return (
    <Link
      href="/cart"
      aria-label={`Корзина: ${totalItems} товаров на ${cartTotal.toLocaleString("ru-RU")} ₽`}
      className="fixed left-4 z-[55] flex items-center gap-2 rounded-full bg-amber-500 pl-3.5 pr-4 py-2.5 shadow-xl shadow-black/25 ring-2 ring-white transition-transform hover:scale-105 active:scale-95 md:hidden"
      style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-slate-900">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
      </svg>
      <span className="text-sm font-bold text-slate-900 tabular-nums">{totalItems}</span>
    </Link>
  );
}
