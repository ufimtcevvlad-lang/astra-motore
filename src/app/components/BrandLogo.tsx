"use client";

import { AstraMarkSvg } from "./AstraMarkSvg";

/**
 * Шапка: векторный знак (прозрачный фон) + текст шрифтом сайта.
 * Не использовать header-logo-preview.png — это мокап с серым фоном для картинки, не для UI.
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
      <div
        className="flex aspect-square h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center sm:h-14 sm:w-14 drop-shadow-[0_0_20px_rgba(251,191,36,0.25)] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_26px_rgba(251,191,36,0.38)]"
        aria-hidden
      >
        <AstraMarkSvg className="block h-full w-full max-h-full max-w-full" />
      </div>

      <div className="min-w-0 select-none">
        <p className="font-medium uppercase leading-none tracking-[0.18em] text-white sm:tracking-[0.22em]">
          <span className="block text-base sm:text-lg lg:text-xl">
            ASTRA <span className="text-amber-400">MOTORS</span>
          </span>
        </p>
        <div className="mt-2 h-px w-11 bg-amber-500/40 sm:w-14" aria-hidden />
        <p className="mt-2 max-w-[17rem] text-[10px] font-normal uppercase leading-relaxed tracking-[0.12em] text-slate-400 sm:max-w-none sm:text-[11px] sm:tracking-[0.14em]">
          Автозапчасти GM
          <span className="text-slate-500"> · </span>
          <span className="font-normal normal-case tracking-normal text-slate-500">Opel & Chevrolet</span>
        </p>
      </div>
    </div>
  );
}
