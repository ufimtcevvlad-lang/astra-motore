import Link from "next/link";

/**
 * Главный hero-блок на главной. УТП «Находим то, чего нет у других».
 *
 * Логотип GM Shop 66 уже есть в шапке — в hero его не повторяем.
 * Главный заголовок (H1) — сам слоган УТП, крупно.
 */
export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#0A0E15] to-[#020617] p-6 text-white shadow-2xl sm:p-10 lg:p-14">
      {/* Точечный паттерн */}
      <div className="absolute inset-0 opacity-[0.07] bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
      {/* Амбер-свечение для объёма */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(245,158,11,0.18),transparent_55%),radial-gradient(circle_at_10%_90%,rgba(251,191,36,0.08),transparent_50%)]" />

      <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Екатеринбург · с 2013 года
          </p>

          <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
            Находим&nbsp;то, чего&nbsp;нет
            <span className="block text-amber-400">у&nbsp;других</span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Специализируемся на запчастях GM в Екатеринбурге. Оригинал и проверенные европейские
            бренды — никакого безымянного хлама. Редкие позиции со своего склада.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/vin-request"
              className="inline-flex items-center justify-center rounded-full bg-amber-400 px-7 py-3.5 text-base font-semibold text-slate-950 shadow-xl shadow-black/40 transition hover:-translate-y-0.5 hover:bg-amber-300"
            >
              Подобрать по VIN
            </Link>
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center rounded-full border border-slate-500/80 px-7 py-3.5 text-base font-medium text-slate-100 transition hover:border-slate-300 hover:bg-white/5"
            >
              Открыть каталог
            </Link>
          </div>

          <ul className="grid gap-y-2 pt-3 text-sm text-slate-300 sm:grid-cols-2 sm:gap-x-6">
            <li className="flex items-center gap-2">
              <span className="text-amber-400" aria-hidden>✓</span>
              Только GM — Opel, Chevrolet
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-400" aria-hidden>✓</span>
              Оригинал и качественные аналоги
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-400" aria-hidden>✓</span>
              Редкие позиции на складе
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-400" aria-hidden>✓</span>
              Подбор по VIN за 15 минут
            </li>
          </ul>
        </div>

        {/* Правая часть hero — 3 равноправные плитки */}
        <div className="grid gap-3">
          <Link
            href="/zapchasti-opel"
            className="group flex items-center justify-between rounded-xl border border-slate-600/50 bg-slate-800/60 p-5 backdrop-blur transition hover:border-amber-500/50 hover:bg-slate-800"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 group-hover:text-amber-300">
                Каталог
              </p>
              <p className="mt-1 text-xl font-bold text-white">Opel</p>
              <p className="mt-0.5 text-xs text-slate-400">Astra, Insignia, Zafira…</p>
            </div>
            <span
              className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-amber-400"
              aria-hidden
            >
              →
            </span>
          </Link>

          <Link
            href="/zapchasti-chevrolet"
            className="group flex items-center justify-between rounded-xl border border-slate-600/50 bg-slate-800/60 p-5 backdrop-blur transition hover:border-amber-500/50 hover:bg-slate-800"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 group-hover:text-amber-300">
                Каталог
              </p>
              <p className="mt-1 text-xl font-bold text-white">Chevrolet</p>
              <p className="mt-0.5 text-xs text-slate-400">Cruze, Captiva, Aveo…</p>
            </div>
            <span
              className="text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-amber-400"
              aria-hidden
            >
              →
            </span>
          </Link>

          <Link
            href="/catalog"
            className="group flex items-center justify-between rounded-xl border border-amber-400/80 bg-amber-400 p-5 shadow-lg shadow-amber-900/30 transition hover:bg-amber-300"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-900">
                Каталог
              </p>
              <p className="mt-1 text-xl font-bold text-slate-950">Вся витрина</p>
              <p className="mt-0.5 text-xs text-slate-800/90">Поиск, группы, фильтр</p>
            </div>
            <span
              className="text-slate-900 transition group-hover:translate-x-0.5"
              aria-hidden
            >
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
