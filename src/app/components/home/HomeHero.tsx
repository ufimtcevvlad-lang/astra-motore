import Link from "next/link";
import { BrandWordmark } from "../BrandWordmark";

/** Главный hero-блок на главной. УТП «Находим то, чего нет у других». */
export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#0A0E15] to-[#020617] p-6 text-white shadow-2xl sm:p-10">
      <div className="absolute inset-0 opacity-[0.07] bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
      <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
            Екатеринбург • с 2013 года
          </p>
          <h1 className="space-y-3 sm:space-y-5">
            <span className="block">
              <BrandWordmark variant="hero" />
            </span>
            <span className="block text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl">
              Находим то, чего нет у других
            </span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Специализируемся на запчастях GM в Екатеринбурге. Оригинал и проверенные европейские
            бренды — никакого безымянного хлама. Редкие позиции со своего склада.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/vin-request"
              className="rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/40 transition hover:bg-amber-300"
            >
              Подобрать по VIN
            </Link>
            <Link
              href="/catalog"
              className="rounded-full border border-slate-500/80 px-6 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-300 hover:bg-white/5"
            >
              Открыть каталог
            </Link>
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-xs text-slate-300 sm:text-sm">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Только GM — Opel, Chevrolet
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Оригинал и качественные аналоги
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Редкие позиции на складе
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Подбор по VIN за 15 минут
            </li>
          </ul>
        </div>

        {/* Правая часть hero — плитки брендов GM */}
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(245,158,11,0.22),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(251,191,36,0.12),transparent_45%)]" />
          <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
            <Link
              href="/zapchasti-opel"
              className="group rounded-xl border border-slate-600/50 bg-slate-800/80 p-4 transition hover:border-amber-500/50 hover:bg-slate-800 sm:p-5"
            >
              <p className="text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-amber-300">
                Каталог
              </p>
              <p className="mt-2 text-lg font-bold text-white">Opel</p>
              <p className="mt-1 text-xs text-slate-400">Astra, Insignia, Zafira…</p>
            </Link>
            <Link
              href="/zapchasti-chevrolet"
              className="group rounded-xl border border-slate-600/50 bg-slate-800/80 p-4 transition hover:border-amber-500/50 hover:bg-slate-800 sm:p-5"
            >
              <p className="text-[10px] uppercase tracking-widest text-slate-500 group-hover:text-amber-300">
                Каталог
              </p>
              <p className="mt-2 text-lg font-bold text-white">Chevrolet</p>
              <p className="mt-1 text-xs text-slate-400">Cruze, Captiva…</p>
            </Link>
            <Link
              href="/catalog"
              className="col-span-2 rounded-xl border border-amber-300/80 bg-amber-400 p-4 text-center shadow-md shadow-black/20 transition hover:bg-amber-300 sm:p-5"
            >
              <p className="text-sm font-semibold text-slate-950">Вся витрина запчастей</p>
              <p className="mt-1 text-xs text-slate-800/90">Поиск, группы, фильтр по марке</p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
