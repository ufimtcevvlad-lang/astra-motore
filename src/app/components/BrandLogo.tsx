"use client";

/**
 * Логотип шапки: растровый знак + типографика.
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center gap-2.5 sm:gap-5 md:gap-6">
      <div
        className="relative flex shrink-0 items-center justify-center overflow-visible transition-[filter] duration-300"
        aria-hidden
      >
        <div className="relative flex h-[3.375rem] w-[3.375rem] shrink-0 items-center justify-center overflow-visible sm:h-[4.375rem] sm:w-[4.375rem] md:h-[5.25rem] md:w-[5.25rem]">
          <div className="relative flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-visible">
            {/* eslint-disable-next-line @next/next/no-img-element -- сохраним точный рендер без wrapper-ограничений */}
            <img
              src="/brand/astra-mark.png"
              alt=""
              draggable={false}
              loading="eager"
              decoding="async"
              className="max-h-full max-w-full origin-center scale-150 object-contain object-center transition-[filter] duration-300 group-hover:brightness-105"
              style={{
                filter:
                  "drop-shadow(0 0 18px rgba(251,191,36,0.32)) drop-shadow(0 0 2px rgba(251,191,36,0.2))",
              }}
            />
          </div>
        </div>
      </div>

      <div className="min-w-0 select-none">
        <div className="inline-block w-fit max-w-full">
          <p className="font-semibold uppercase leading-[1.05] tracking-[0.14em] text-white sm:tracking-[0.2em]">
            <span className="block whitespace-nowrap text-[0.95rem] sm:text-xl md:text-2xl">
              ASTRA <span className="text-amber-400">MOTORS</span>
            </span>
          </p>
          <div className="mt-1.5 h-px w-full bg-amber-400/55 sm:mt-2.5" aria-hidden />
        </div>
        <p className="mt-1.5 max-w-[15rem] text-[9px] font-medium uppercase leading-relaxed tracking-[0.11em] text-slate-400 sm:mt-2.5 sm:max-w-none sm:text-xs md:text-[0.8125rem] md:tracking-[0.16em]">
          Автозапчасти GM
          <span className="text-slate-500"> · </span>
          <span className="font-normal normal-case tracking-normal text-slate-500">
            Opel & Chevrolet
          </span>
        </p>
      </div>
    </div>
  );
}
