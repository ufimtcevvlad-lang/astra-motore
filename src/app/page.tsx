import Link from "next/link";
import type { Metadata } from "next";
import { HomeFeatured } from "./components/HomeFeatured";
import { HOME_FEATURED_PRODUCTS } from "./data/products";

export const metadata: Metadata = {
  title: "Главная",
  description:
    "Astra Motors — автозапчасти GM для Opel и Chevrolet в Екатеринбурге. Оригинал и аналоги, доставка, подбор по артикулу. Перейдите в каталог или свяжитесь с менеджером.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="space-y-14">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#05070A] via-[#0f172a] to-[#020617] p-6 sm:p-10 text-white shadow-2xl">
        <div className="absolute inset-0 opacity-[0.07] bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
        <div className="relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-center">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              Екатеринбург • GM • Opel &amp; Chevrolet
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              Запчасти с доставкой{" "}
              <span className="text-amber-400">&amp;</span>{" "}
              честный подбор
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl leading-relaxed">
              Оригинал и проверенные аналоги. Удобный каталог на отдельной странице — без перегруза главной.
              Менеджер поможет, если артикула нет в списке.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/catalog"
                className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/40 hover:bg-amber-300 transition"
              >
                Открыть каталог
              </Link>
              <Link
                href="/contacts"
                className="rounded-full border border-slate-500/80 px-6 py-3 text-sm font-medium text-slate-100 hover:border-slate-300 hover:bg-white/5 transition"
              >
                Связаться
              </Link>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-400 pt-2">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Доставка по городу
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Корзина на сайте
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Личный кабинет
              </li>
            </ul>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.22),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(251,191,36,0.12),transparent_45%)]" />
            <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
              <Link
                href="/zapchasti-opel"
                className="rounded-xl bg-slate-800/80 border border-slate-600/50 p-4 sm:p-5 hover:border-amber-500/50 hover:bg-slate-800 transition group"
              >
                <p className="text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-amber-300">
                  Каталог
                </p>
                <p className="mt-2 text-lg font-bold text-white">Opel</p>
                <p className="text-xs text-slate-400 mt-1">Astra, Insignia, Zafira…</p>
              </Link>
              <Link
                href="/zapchasti-chevrolet"
                className="rounded-xl bg-slate-800/80 border border-slate-600/50 p-4 sm:p-5 hover:border-amber-500/50 hover:bg-slate-800 transition group"
              >
                <p className="text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-amber-300">
                  Каталог
                </p>
                <p className="mt-2 text-lg font-bold text-white">Chevrolet</p>
                <p className="text-xs text-slate-400 mt-1">Cruze, Captiva…</p>
              </Link>
              <Link
                href="/catalog"
                className="col-span-2 rounded-xl bg-amber-400 border border-amber-300/80 p-4 sm:p-5 text-center hover:bg-amber-300 transition shadow-md shadow-black/20"
              >
                <p className="text-sm font-semibold text-slate-950">Вся витрина запчастей</p>
                <p className="text-xs text-slate-800/90 mt-1">Поиск, группы, фильтр по марке</p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            t: "По артикулу",
            d: "Пришлите OEM или название — сверим применимость и предложим оригинал или аналог.",
          },
          {
            t: "Без навязанного бренда",
            d: "Покажем варианты по цене и срокам — выбираете вы.",
          },
          {
            t: "Работаем офлайн и онлайн",
            d: "Заказ через сайт и звонок. Самовывоз и доставка по Екатеринбургу.",
          },
        ].map((x) => (
          <div
            key={x.t}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-amber-400/50 transition"
          >
            <h2 className="text-sm font-semibold text-slate-900">{x.t}</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">{x.d}</p>
          </div>
        ))}
      </section>

      <HomeFeatured items={HOME_FEATURED_PRODUCTS} />

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 sm:p-8 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Куда зайти дальше</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/catalog"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-amber-500/60 hover:text-amber-700 transition"
          >
            Каталог товаров
          </Link>
          <Link
            href="/zapchasti-gm"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-amber-500/60 hover:text-amber-700 transition"
          >
            Запчасти GM
          </Link>
          <Link
            href="/how-to-order"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-amber-500/60 hover:text-amber-700 transition"
          >
            Как заказать
          </Link>
          <Link
            href="/dostavka-zapchastey-ekaterinburg"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-amber-500/60 hover:text-amber-700 transition"
          >
            Доставка
          </Link>
        </div>
      </section>
    </div>
  );
}
