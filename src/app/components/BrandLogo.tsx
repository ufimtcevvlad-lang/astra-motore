"use client";

import { AstraMarkSvg } from "./AstraMarkSvg";

/**
 * Логотип шапки: только SVG (прозрачный фон) + типографика.
 * Растровые мокапы с серым фоном не используем.
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center gap-3.5 sm:gap-5 md:gap-6">
      {/* Крупный читаемый знак: 68px → 80px → 88px */}
      <div
        className="flex aspect-square h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center sm:h-20 sm:w-20 md:h-[5.5rem] md:w-[5.5rem] drop-shadow-[0_0_24px_rgba(251,191,36,0.3)] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_32px_rgba(251,191,36,0.45)]"
        aria-hidden
      >
        <AstraMarkSvg className="block h-full w-full max-h-full max-w-full" />
      </div>

      <div className="min-w-0 select-none">
        {/* Линия на всю ширину надписи ASTRA MOTORS */}
        <div className="inline-block w-fit max-w-full">
          <p className="font-semibold uppercase leading-[1.05] tracking-[0.16em] text-white sm:tracking-[0.2em]">
            <span className="block whitespace-nowrap text-lg sm:text-xl md:text-2xl">
              ASTRA <span className="text-amber-400">MOTORS</span>
            </span>
          </p>
          <div className="mt-2.5 h-px w-full bg-amber-400/55" aria-hidden />
        </div>
        <p className="mt-2.5 max-w-[18rem] text-[11px] font-medium uppercase leading-relaxed tracking-[0.14em] text-slate-400 sm:max-w-none sm:text-xs md:text-[0.8125rem] md:tracking-[0.16em]">
          Автозапчасти GM
          <span className="text-slate-500"> · </span>
          <span className="font-normal normal-case tracking-normal text-slate-500">Opel & Chevrolet</span>
        </p>
      </div>
    </div>
  );
}
