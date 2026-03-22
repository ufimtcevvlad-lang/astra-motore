/**
 * Векторный логотип Astra Motors в палитре сайта (янтарь / золото).
 * Не использует растровое изображение — чётко на любом DPI.
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
      {/* Знак */}
      <div className="relative shrink-0">
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl bg-amber-400/15 blur-xl"
          aria-hidden
        />
        <svg
          viewBox="0 0 64 64"
          className="relative h-14 w-14 drop-shadow-[0_0_18px_rgba(251,191,36,0.35)] transition duration-300 ease-out group-hover:scale-[1.03] group-hover:drop-shadow-[0_0_22px_rgba(251,191,36,0.45)] sm:h-16 sm:w-16"
          aria-hidden
        >
          <defs>
            <linearGradient
              id="astraLogoGold"
              x1="10"
              y1="6"
              x2="54"
              y2="58"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="35%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id="astraLogoGoldSoft" x1="32" y1="10" x2="32" y2="54" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Карточка знака */}
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="14"
            fill="#060a12"
            stroke="url(#astraLogoGold)"
            strokeWidth="1.15"
            opacity={0.98}
          />

          {/* Двойное кольцо — «техничный» акцент */}
          <circle
            cx="32"
            cy="32"
            r="22"
            fill="none"
            stroke="url(#astraLogoGoldSoft)"
            strokeWidth="0.9"
            opacity={0.35}
          />
          <circle
            cx="32"
            cy="32"
            r="18"
            fill="none"
            stroke="url(#astraLogoGold)"
            strokeWidth="1.65"
            opacity={0.95}
          />

          {/* Монограмма AM */}
          <g
            stroke="url(#astraLogoGold)"
            strokeWidth="2.65"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M24 46 L32 18 L40 46" />
            <path d="M27.5 34 H36.5" />
            <path d="M44 46 V26 L38 32 L32 26 V46" />
          </g>

          {/* Акцент — ромб */}
          <rect
            x="31"
            y="31"
            width="2.8"
            height="8"
            rx="1.4"
            fill="#f59e0b"
            transform="rotate(45 32 35)"
          />
        </svg>
      </div>

      {/* Словесный блок */}
      <div className="min-w-0 select-none">
        <p className="font-bold leading-none tracking-[0.08em] text-white sm:tracking-[0.1em]">
          <span className="block text-base sm:text-lg lg:text-xl">
            ASTRA{" "}
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
              MOTORS
            </span>
          </span>
        </p>
        <p className="mt-1.5 max-w-[14rem] text-[10px] font-medium uppercase leading-snug tracking-[0.18em] text-slate-500 sm:max-w-none sm:text-[11px] sm:tracking-[0.2em]">
          Автозапчасти GM
          <span className="text-slate-600"> · </span>
          <span className="font-normal normal-case tracking-normal text-slate-400">Opel & Chevrolet</span>
        </p>
      </div>
    </div>
  );
}
