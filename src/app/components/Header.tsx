"use client";

import Link from "next/link";
import { useCart } from "./CartContext";

export function Header() {
  const { items } = useCart();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="border-b-2 border-sky-900/20 bg-gradient-to-r from-sky-900 to-sky-800 shadow-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
            Astra Motors
          </span>
          <span className="text-xs font-medium text-sky-200/90 hidden sm:inline">
            запчасти с доставкой
          </span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link href="/" className="text-sm font-medium text-sky-100 hover:text-white transition">
            Каталог
          </Link>
          <Link href="/how-to-order" className="text-sm font-medium text-sky-100 hover:text-white transition">
            Как заказать
          </Link>
          <Link href="/contacts" className="text-sm font-medium text-sky-100 hover:text-white transition">
            Контакты
          </Link>
          <Link
            href="/cart"
            className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-sky-900 shadow-md hover:bg-amber-300 transition"
          >
            Корзина
            {totalItems > 0 && (
              <span className="rounded-full bg-sky-900 px-2 py-0.5 text-xs font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
