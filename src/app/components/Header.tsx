"use client";

import Link from "next/link";
import { Suspense, useEffect, useId, useState, type ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";
import {
  HeaderSearchAutocomplete,
  HeaderSearchAutocompleteFallback,
} from "./search/HeaderSearchAutocomplete";
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
  "whitespace-nowrap rounded-lg px-2 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/5 hover:text-white sm:px-2.5 sm:text-sm";

const dropBox =
  "min-w-[240px] rounded-xl border border-slate-700/90 bg-[#0a1018] py-2 shadow-2xl shadow-black/40";

const dropItem =
  "block px-4 py-2 text-sm text-slate-200 transition hover:bg-amber-400/10 hover:text-amber-200";

function NavHoverDropdown({
  label,
  menuId,
  children,
}: {
  label: string;
  menuId: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const reactId = useId();
  const menuDomId = `${menuId}-${reactId.replace(/:/g, "")}`;

  return (
    <div
      className="relative flex min-w-0 flex-none flex-col items-center justify-center sm:flex-1"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`${navLink} flex w-full cursor-pointer items-center justify-center text-center`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuDomId}
        id={`${menuDomId}-trigger`}
      >
        {label}{" "}
        <span className="text-slate-500" aria-hidden>
          ▾
        </span>
      </button>
      {/* pt-1 — «мостик» в зоне hover, чтобы курсор не выходил из блока между кнопкой и панелью */}
      <div
        id={menuDomId}
        role="menu"
        aria-labelledby={`${menuDomId}-trigger`}
        className={`absolute left-1/2 top-full z-50 flex min-w-[240px] -translate-x-1/2 flex-col items-stretch pt-1 transition-opacity duration-150 ease-out ${
          open
            ? "visible opacity-100"
            : "invisible pointer-events-none opacity-0"
        }`}
      >
        <div className={dropBox}>{children}</div>
      </div>
    </div>
  );
}

export function Header() {
  const { items } = useCart();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const [user, setUser] = useState<MeResponse["user"]>(null);
  const [showDesktopQuickBar, setShowDesktopQuickBar] = useState(false);

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

  useEffect(() => {
    function onScroll() {
      setShowDesktopQuickBar(window.scrollY > 140);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-gradient-to-r from-[#05070A] via-[#090D13] to-[#05070A] shadow-lg">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-5">
        {/* Верхняя строка: логотип | поиск | корзина | вход */}
        <div className="flex flex-col gap-3 py-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between lg:py-4">
          <Link
            href="/"
            className="group flex min-w-0 flex-shrink-0 items-center overflow-visible rounded-lg py-1 pr-1 outline-none transition hover:opacity-[0.98] focus-visible:ring-2 focus-visible:ring-amber-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070A]"
            aria-label="Astra Motors — на главную"
          >
            <BrandLogo />
          </Link>

          <Suspense fallback={<HeaderSearchAutocompleteFallback />}>
            <HeaderSearchAutocomplete />
          </Suspense>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 lg:flex-nowrap lg:pl-2">
            <Link
              href="/cart"
              className="flex items-center gap-1.5 rounded-full bg-amber-400 px-2.5 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-black/25 transition hover:bg-amber-300 sm:px-4 sm:py-2.5 sm:text-sm"
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
                className="rounded-lg border border-slate-500 px-2.5 py-2 text-xs font-medium text-slate-100 transition hover:border-slate-300 hover:text-white sm:px-3 sm:text-sm"
              >
                Профиль
              </Link>
            ) : (
              <div className="flex overflow-hidden rounded-lg border border-slate-500/90 divide-x divide-slate-600/90">
                <Link
                  href="/auth/login"
                  className="px-2 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/5 sm:px-3 sm:text-sm"
                >
                  Войти
                </Link>
                <Link
                  href="/auth/register"
                  className="px-2 py-2 text-xs font-medium text-slate-100 transition hover:bg-white/5 sm:px-3 sm:text-sm"
                >
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Основное меню — на всю ширину контейнера */}
        <nav
          className="flex w-full items-stretch gap-1 overflow-x-auto border-t border-slate-800/90 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:flex-nowrap sm:gap-0 sm:overflow-visible"
          aria-label="Основное меню"
        >
          <Link href="/" className={`${navLink} flex min-w-max flex-none items-center justify-center text-center sm:min-w-0 sm:flex-1`}>
            Главная
          </Link>

          <NavHoverDropdown label="Каталог" menuId="nav-catalog">
            <Link href="/catalog" className={dropItem} role="menuitem">
              Витрина
            </Link>
            <Link href="/zapchasti-opel" className={dropItem} role="menuitem">
              Opel
            </Link>
            <Link href="/zapchasti-chevrolet" className={dropItem} role="menuitem">
              Chevrolet
            </Link>
            <Link href="/zapchasti-gm" className={dropItem} role="menuitem">
              GM
            </Link>
          </NavHoverDropdown>

          <NavHoverDropdown label="Клиентам" menuId="nav-clients">
            <Link href="/about" className={dropItem} role="menuitem">
              О компании
            </Link>
            <Link href="/how-to-order" className={dropItem} role="menuitem">
              Как сделать заказ
            </Link>
            <Link href="/privacy" className={dropItem} role="menuitem">
              Обработка персональных данных
            </Link>
            <Link href="/supply-agreement" className={dropItem} role="menuitem">
              Договор поставки
            </Link>
            <Link href="/warranty" className={dropItem} role="menuitem">
              Положение о гарантии
            </Link>
            <Link href="/returns" className={dropItem} role="menuitem">
              Возврат
            </Link>
          </NavHoverDropdown>

          <Link
            href="/dostavka-zapchastey-ekaterinburg"
            className={`${navLink} flex min-w-max flex-none items-center justify-center text-center leading-snug sm:min-w-0 sm:flex-1`}
          >
            Оплата и доставка
          </Link>
          <Link href="/contacts" className={`${navLink} flex min-w-max flex-none items-center justify-center text-center sm:min-w-0 sm:flex-1`}>
            Контакты
          </Link>
          <Link href="/vin-request" className={`${navLink} flex min-w-max flex-none items-center justify-center text-center sm:min-w-0 sm:flex-1`}>
            VIN запрос
          </Link>
        </nav>
      </div>

      {/* Desktop: компактная панель сверху при скролле */}
      <div
        className={`pointer-events-none fixed inset-x-0 top-2 z-[120] hidden px-3 transition-all duration-200 sm:block ${
          showDesktopQuickBar ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
        }`}
      >
        <div className="pointer-events-auto mx-auto flex w-full max-w-5xl items-center gap-2 rounded-2xl border border-slate-700/90 bg-[#0a1018]/95 p-2 shadow-2xl shadow-black/50 backdrop-blur">
          <form action="/catalog" method="get" className="min-w-0 flex flex-1 items-center">
            <input
              type="search"
              name="q"
              placeholder="VIN, название или артикул"
              autoComplete="off"
              className="h-10 w-full rounded-xl border border-slate-600/80 bg-slate-900/70 px-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-400/70"
            />
          </form>
          <Link
            href="/catalog"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/70 px-4 text-sm font-medium text-slate-100 transition hover:border-amber-400/70"
          >
            Каталог
          </Link>
          <Link
            href="/cart"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            Корзина
            {totalItems > 0 ? (
              <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] text-amber-300">{totalItems}</span>
            ) : null}
          </Link>
          <Link
            href={user ? "/account" : "/auth/login"}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-900/70 px-4 text-sm font-medium text-slate-100 transition hover:border-amber-400/70"
          >
            {user ? "Профиль" : "Войти"}
          </Link>
        </div>
      </div>
    </header>
  );
}
