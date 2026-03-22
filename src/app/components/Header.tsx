"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { CatalogHubStrip } from "./catalog/CatalogHubStrip";
import { useCart } from "./CartContext";

type MeResponse = {
  user: null | {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    createdAt: string;
  };
};

export function Header() {
  const { items } = useCart();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const [user, setUser] = useState<MeResponse["user"]>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: MeResponse) => {
        if (!mounted) return;
        setUser(data.user);
      })
      .catch(() => {
        if (!mounted) return;
        setUser(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header className="border-b border-slate-800 bg-gradient-to-r from-[#05070A] via-[#090D13] to-[#05070A] shadow-lg">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 py-4">
          <Link
            href="/"
            className="group flex min-w-0 flex-shrink-0 items-center rounded-lg py-1 pr-1 outline-none transition hover:opacity-[0.98] focus-visible:ring-2 focus-visible:ring-amber-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070A]"
            aria-label="Astra Motors — на главную"
          >
            <BrandLogo />
          </Link>

          <nav className="flex items-center gap-3 sm:gap-5">
            <Link href="/" className="text-sm font-medium text-slate-100 hover:text-white transition">
              Главная
            </Link>
            <Link href="/catalog" className="text-sm font-medium text-slate-100 hover:text-white transition">
              Каталог
            </Link>
            <Link href="/how-to-order" className="text-sm font-medium text-slate-100 hover:text-white transition">
              Как заказать
            </Link>
            <Link href="/contacts" className="text-sm font-medium text-slate-100 hover:text-white transition">
              Контакты
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Link
                href="/account"
                className="rounded-md border border-slate-500 px-3 py-1.5 text-sm font-medium text-slate-100 hover:border-slate-300 hover:text-white transition"
              >
                ЛК
              </Link>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm font-medium text-slate-100 hover:text-white transition">
                  Войти
                </Link>
                <Link
                  href="/auth/register"
                  className="rounded-md border border-slate-500 px-3 py-1.5 text-sm font-medium text-slate-100 hover:border-slate-300 hover:text-white transition"
                >
                  Регистрация
                </Link>
              </>
            )}
            <Link
              href="/cart"
              className="flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-black/25 hover:bg-amber-300 transition"
            >
              Корзина
              {totalItems > 0 && (
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-amber-400">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pb-2 text-[11px] text-slate-300/80">
          <span className="uppercase tracking-[0.2em] text-[10px] text-slate-500">
            Бренды
          </span>
          <span>Opel</span>
          <span>Chevrolet</span>
        </div>
        <CatalogHubStrip />
      </div>
    </header>
  );
}
