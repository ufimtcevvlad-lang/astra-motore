"use client";

import Link from "next/link";
import { useCart } from "./CartContext";

export function Header() {
  const { items } = useCart();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <header className="border-b border-slate-800 bg-gradient-to-r from-[#05070A] via-[#090D13] to-[#05070A] shadow-lg">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="group flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
              Astra Motors
            </span>
            <span className="text-[11px] font-medium text-slate-300 hidden sm:inline">
              VAG &amp; GM запчасти
            </span>
          </Link>
          <nav className="flex items-center gap-3 sm:gap-5">
            <Link href="/" className="text-sm font-medium text-slate-100 hover:text-white transition">
              Каталог
            </Link>
            <Link href="/how-to-order" className="text-sm font-medium text-slate-100 hover:text-white transition">
              Как заказать
            </Link>
            <Link href="/contacts" className="text-sm font-medium text-slate-100 hover:text-white transition">
              Контакты
            </Link>
            <Link
              href="/cart"
              className="flex items-center gap-1.5 rounded-full bg-[#F5E266] px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-md hover:bg-[#F6D96F] transition"
            >
              Корзина
              {totalItems > 0 && (
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-[#F5E266]">
                  {totalItems}
                </span>
              )}
            </Link>
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-3 text-[11px] text-slate-300/80">
          <span className="uppercase tracking-[0.2em] text-[10px] text-slate-500">
            Бренды
          </span>
          <span>Opel</span>
          <span>Chevrolet</span>
          <span>Hummer</span>
          <span>Cadillac</span>
          <span className="h-3 w-px bg-slate-700 mx-1" />
          <span>Volkswagen</span>
          <span>Audi</span>
          <span>Skoda</span>
          <span>Seat</span>
        </div>
      </div>
    </header>
  );
}
