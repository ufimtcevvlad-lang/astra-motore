"use client";

import Image from "next/image";

/**
 * Логотип шапки: растровый знак (PNG @2×) + типографика.
 * Цвета подбираются скриптом `scripts/build-astra-mark.py` под `amber-400` (#fbbf24).
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center gap-2.5 sm:gap-5 md:gap-6">
      <div
        className="relative flex shrink-0 items-center justify-center overflow-visible -translate-y-0.5 drop-shadow-[0_0_24px_rgba(251,191,36,0.3)] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_32px_rgba(251,191,36,0.45)]"
        aria-hidden
      >
        {/* Внешний квадрат чуть больше; знак внутри ~72% — запас по краям, без «среза» снизу */}
        <div className="relative flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center overflow-visible sm:h-[5.25rem] sm:w-[5.25rem] md:h-[6rem] md:w-[6rem]">
          <div className="relative h-[72%] w-[72%] min-h-0 min-w-0">
            <Image
              src="/brand/astra-mark.png"
              alt=""
              fill
              priority
              quality={100}
              sizes="(max-width: 768px) 2.75rem, (max-width: 1024px) 3.75rem, 4.25rem"
              className="object-contain object-center"
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
