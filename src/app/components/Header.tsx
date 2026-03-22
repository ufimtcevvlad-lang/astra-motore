"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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

const navLink =
  "whitespace-nowrap rounded-lg px-1.5 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white sm:px-2.5";

const dropPanel =
  "absolute left-1/2 top-full z-50 mt-1 min-w-[240px] -translate-x-1/2 rounded-xl border border-slate-700/90 bg-[#0a1018] py-2 shadow-2xl shadow-black/40";

const dropItem =
  "block px-4 py-2 text-sm text-slate-200 transition hover:bg-amber-400/10 hover:text-amber-200";

function HeaderSearchFormInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const qFromUrl = pathname === "/catalog" ? (searchParams.get("q") ?? "") : "";

  return (
    <form
      action="/catalog"
      method="get"
      className="flex w-full min-w-0 flex-1 items-stretch gap-2 lg:max-w-none"
      role="search"
    >
      <label htmlFor="header-catalog-q" className="sr-only">
        Поиск по номеру или названию детали
      </label>
      <input
        id="header-catalog-q"
        key={qFromUrl}
        name="q"
        type="search"
        defaultValue={qFromUrl}
        placeholder="Введите номер или название детали"
        autoComplete="off"
        className="min-w-0 flex-1 rounded-xl border border-slate-600/80 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/25"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-black/20 transition hover:bg-amber-300"
      >
        Поиск
      </button>
    </form>
  );
}

function HeaderSearchFormFallback() {
  return (
    <form
      action="/catalog"
      method="get"
      className="flex w-full min-w-0 flex-1 items-stretch gap-2 lg:max-w-none"
      role="search"
    >
      <label htmlFor="header-catalog-q-fb" className="sr-only">
        Поиск по номеру или названию детали
      </label>
      <input
        id="header-catalog-q-fb"
        name="q"
        type="search"
        placeholder="Введите номер или название детали"
        autoComplete="off"
        className="min-w-0 flex-1 rounded-xl border border-slate-600/80 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/25"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-black/20 transition hover:bg-amber-300"
      >
        Поиск
      </button>
    </form>
  );
}

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
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-5">
        {/* Верхняя строка: логотип | поиск | корзина | вход */}
        <div className="flex flex-col gap-3 py-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between lg:py-4">
          <Link
            href="/"
            className="group flex min-w-0 flex-shrink-0 items-center rounded-lg py-1 pr-1 outline-none transition hover:opacity-[0.98] focus-visible:ring-2 focus-visible:ring-amber-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070A]"
            aria-label="Astra Motors — на главную"
          >
            <BrandLogo />
          </Link>

          <Suspense fallback={<HeaderSearchFormFallback />}>
            <HeaderSearchFormInner />
          </Suspense>

          <div className="flex shrink-0 items-center justify-end gap-2 lg:pl-2">
            <Link
              href="/cart"
              className="flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 shadow-md shadow-black/25 transition hover:bg-amber-300 sm:px-4 sm:py-2.5"
            >
              Корзина
              {totalItems > 0 && (
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-amber-400">
                  {totalItems}
                </span>
              )}
            </Link>
            {user ? (
              <Link
                href="/account"
                className="rounded-lg border border-slate-500 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-slate-300 hover:text-white"
              >
                ЛК
              </Link>
            ) : (
              <div className="flex overflow-hidden rounded-lg border border-slate-500/90 divide-x divide-slate-600/90">
                <Link
                  href="/auth/login"
                  className="px-2.5 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/5 sm:px-3 sm:text-sm"
                >
                  Войти
                </Link>
                <Link
                  href="/auth/register"
                  className="px-2.5 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/5 sm:px-3 sm:text-sm"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Основное меню — на всю ширину контейнера */}
        <nav
          className="flex w-full flex-wrap items-stretch border-t border-slate-800/90 py-2 sm:flex-nowrap"
          aria-label="Основное меню"
        >
          <Link href="/" className={`${navLink} flex min-w-0 flex-1 items-center justify-center text-center`}>
            Главная
          </Link>

          <details className="group relative flex min-w-0 flex-1 flex-col items-center">
            <summary
              className={`${navLink} flex cursor-pointer list-none items-center justify-center text-center [&::-webkit-details-marker]:hidden`}
            >
              Каталог{" "}
              <span className="text-slate-500" aria-hidden>
                ▾
              </span>
            </summary>
            <div className={dropPanel}>
              <Link href="/catalog" className={dropItem}>
                Витрина
              </Link>
              <Link href="/zapchasti-opel" className={dropItem}>
                Opel
              </Link>
              <Link href="/zapchasti-chevrolet" className={dropItem}>
                Chevrolet
              </Link>
              <Link href="/zapchasti-gm" className={dropItem}>
                GM
              </Link>
            </div>
          </details>

          <details className="group relative flex min-w-0 flex-1 flex-col items-center">
            <summary
              className={`${navLink} flex cursor-pointer list-none items-center justify-center text-center [&::-webkit-details-marker]:hidden`}
            >
              Клиентам{" "}
              <span className="text-slate-500" aria-hidden>
                ▾
              </span>
            </summary>
            <div className={dropPanel}>
              <Link href="/about" className={dropItem}>
                О компании
              </Link>
              <Link href="/how-to-order" className={dropItem}>
                Как сделать заказ
              </Link>
              <Link href="/privacy" className={dropItem}>
                Обработка персональных данных
              </Link>
              <Link href="/supply-agreement" className={dropItem}>
                Договор поставки
              </Link>
              <Link href="/warranty" className={dropItem}>
                Положение о гарантии
              </Link>
              <Link href="/returns" className={dropItem}>
                Возврат
              </Link>
            </div>
          </details>

          <Link
            href="/dostavka-zapchastey-ekaterinburg"
            className={`${navLink} flex min-w-0 flex-1 items-center justify-center text-center leading-snug`}
          >
            Оплата и доставка
          </Link>
          <Link href="/contacts" className={`${navLink} flex min-w-0 flex-1 items-center justify-center text-center`}>
            Контакты
          </Link>
          <Link href="/vin-request" className={`${navLink} flex min-w-0 flex-1 items-center justify-center text-center`}>
            VIN запрос
          </Link>
        </nav>

        <CatalogHubStrip />
      </div>
    </header>
  );
}
