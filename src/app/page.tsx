import Link from "next/link";
import { ProductCatalog } from "./components/ProductCatalog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Каталог автозапчастей",
  description:
    "Каталог Astra Motors: автозапчасти GM — Opel, Chevrolet, Cadillac и Hummer. Подбор по VIN, оригинал и качественные аналоги. Быстрый поиск по названию, бренду, авто и артикулу.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#05070A] via-[#111827] to-[#020308] p-6 sm:p-8 text-white shadow-2xl">
        <div className="relative z-10 grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              Специализация
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Автозапчасти GM{" "}
              <span className="text-[#F5E266]">&amp;</span>{" "}
              Opel &amp; Chevrolet с подбором по VIN
            </h1>
            <p className="text-slate-200 text-sm sm:text-base max-w-xl">
              Оригинальные и проверенные аналоги для популярных моделей Opel, Chevrolet, Cadillac и Hummer.
              Подберём по VIN и доставим в короткий срок.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href="/how-to-order"
                className="rounded-full bg-[#F5E266] px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-md hover:bg-[#F6D96F] transition"
              >
                Подобрать по VIN
              </Link>
              <Link
                href="/contacts"
                className="rounded-full border border-slate-500/70 px-5 py-2.5 text-sm font-medium text-slate-100 hover:border-slate-300 hover:text-white transition"
              >
                Контакты и режим работы
              </Link>
              <Link
                href="#catalog"
                className="rounded-full border border-slate-500/70 px-5 py-2.5 text-sm font-medium text-slate-100 hover:border-slate-300 hover:text-white transition"
              >
                Перейти в каталог
              </Link>
            </div>
          </div>

          <div className="relative h-40 sm:h-52 md:h-60">
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,_rgba(245,226,102,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.18),_transparent_55%)]" />
            <div className="relative flex h-full items-end justify-between px-3 sm:px-6">
              <div className="w-1/2">
                <div className="h-20 sm:h-28 md:h-32 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 shadow-lg flex items-end justify-center">
                  <span className="mb-2 text-[11px] font-semibold text-slate-200">
                    Opel / Chevrolet
                  </span>
                </div>
              </div>
              <div className="w-1/2 -ml-4 sm:-ml-6">
                <div className="h-20 sm:h-28 md:h-32 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-700 shadow-lg flex items-end justify-center">
                  <span className="mb-2 text-[11px] font-semibold text-slate-200">
                    Cadillac / Hummer
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1">
              Opel
            </p>
            <p className="text-sm font-medium text-slate-800 mb-1">
              Astra, Zafira, Insignia и другие модели
            </p>
            <p className="text-xs text-slate-600">
              Подбор запчастей по VIN и под заказ
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1">
              Chevrolet
            </p>
            <p className="text-sm font-medium text-slate-800 mb-1">
              Cruze, Captiva, Equinox и другие модели
            </p>
            <p className="text-xs text-slate-600">
              Оригиналы и качественные аналоги
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/70 bg-white/90 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 mb-1">
              Обслуживание
            </p>
            <p className="text-sm font-medium text-slate-800 mb-1">
              Подбор по VIN и под заказ
            </p>
            <p className="text-xs text-slate-600">
              Находим нужную деталь по VIN, предлагаем оригинал и аналог, при необходимости везём под заказ.
            </p>
          </div>
        </div>
      </section>

      <section id="catalog">
        <ProductCatalog />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Подбор автозапчастей GM (Opel, Chevrolet) по VIN — быстро и без ошибок
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Поможем подобрать оригинальные детали и проверенные аналоги для Opel, Chevrolet, Cadillac и Hummer.
              Достаточно VIN или данных автомобиля — уточним совместимость, срок и цену.
            </p>
            <p className="text-sm text-slate-600">
              Если нужной позиции нет в каталоге, всё равно напишите — привезём под заказ.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-600">
              Работаем с ходовой, тормозной системой, фильтрами, свечами, АКБ и другими категориями. Подбор по артикулу и кроссам.
            </p>
            <p className="text-sm text-slate-600">
              Условия уточняй на странице{" "}
              <Link href="/how-to-order" className="text-sky-700 font-medium hover:underline">
                «Как заказать»
              </Link>{" "}
              или в{" "}
              <Link href="/contacts" className="text-sky-700 font-medium hover:underline">
                контактах
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}