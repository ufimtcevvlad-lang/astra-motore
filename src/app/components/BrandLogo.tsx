/**
 * Векторный логотип Astra Motors — знак + словесная часть в палитре сайта.
 * Знак: круглый медальон с монограммой A (без «шумных» колец и лишних деталей).
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
      {/* Знак: медальон + A */}
      <div className="relative shrink-0">
        <div
          className="pointer-events-none absolute -inset-1 rounded-full bg-amber-400/20 blur-2xl"
          aria-hidden
        />
        <svg
          viewBox="0 0 64 64"
          className="relative h-14 w-14 drop-shadow-[0_0_20px_rgba(251,191,36,0.32)] transition duration-300 ease-out group-hover:scale-[1.04] group-hover:drop-shadow-[0_0_28px_rgba(251,191,36,0.5)] sm:h-[4.25rem] sm:w-[4.25rem]"
          aria-hidden
        >
          <defs>
            <linearGradient
              id="brandMarkGold"
              x1="8"
              y1="4"
              x2="56"
              y2="60"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="30%" stopColor="#fde047" />
              <stop offset="55%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <radialGradient id="brandMarkCore" cx="32" cy="28" r="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#111827" />
              <stop offset="70%" stopColor="#030712" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
          </defs>

          {/* Внешний круг — «медальон» */}
          <circle cx="32" cy="32" r="29.5" fill="url(#brandMarkCore)" />
          <circle
            cx="32"
            cy="32"
            r="29.5"
            fill="none"
            stroke="url(#brandMarkGold)"
            strokeWidth="1.85"
            opacity={0.95}
          />
          {/* Тонкий внутренний обод — глубина без шума */}
          <circle
            cx="32"
            cy="32"
            r="24.5"
            fill="none"
            stroke="url(#brandMarkGold)"
            strokeWidth="0.55"
            opacity={0.22}
          />

          {/* Монограмма A — одна уверенная форма, толстый штрих */}
          <path
            d="M32 21 L23.5 46 M32 21 L40.5 46 M26 36.25 H38"
            fill="none"
            stroke="url(#brandMarkGold)"
            strokeWidth="3.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Лёгкий блик на ободе (12 часов) */}
          <path
            d="M32 3 A29 29 0 0 1 52 18"
            fill="none"
            stroke="url(#brandMarkGold)"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity={0.35}
          />
        </svg>
      </div>

      {/* Словесный блок — как договорились, типографика ASTRA MOTORS */}
      <div className="min-w-0 select-none">
        <p className="font-bold leading-[1.05] tracking-[0.06em] text-white sm:tracking-[0.08em]">
          <span className="block text-[1.05rem] sm:text-xl lg:text-2xl">
            ASTRA{" "}
            <span className="bg-gradient-to-r from-amber-100 via-amber-400 to-amber-600 bg-clip-text text-transparent">
              MOTORS
            </span>
          </span>
        </p>
        <p className="mt-1.5 max-w-[15rem] text-[10px] font-medium uppercase leading-snug tracking-[0.16em] text-slate-500 sm:max-w-none sm:text-[11px] sm:tracking-[0.18em]">
          Автозапчасти GM
          <span className="text-slate-600"> · </span>
          <span className="font-normal normal-case tracking-normal text-slate-400">Opel & Chevrolet</span>
        </p>
      </div>
    </div>
  );
}
