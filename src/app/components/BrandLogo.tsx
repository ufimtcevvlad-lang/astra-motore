"use client";

import { AstraMarkSvg } from "./AstraMarkSvg";

/**
 * Логотип в шапке: чёткий векторный знак (шестерня + AM) в палитре сайта
 * + текстовый блок. Без PNG — без артефактов сжатия на Retina.
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center gap-3.5 sm:gap-5">
      {/* Квадрат 1:1 — знак не растягивается, только масштабируется пропорционально */}
      <div
        className="flex aspect-square h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16 drop-shadow-[0_0_22px_rgba(251,191,36,0.28)] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_28px_rgba(251,191,36,0.42)]"
        aria-hidden
      >
        <AstraMarkSvg className="block h-full w-full max-h-full max-w-full" />
      </div>

      <div className="min-w-0 select-none">
        <p className="font-medium uppercase leading-none tracking-[0.2em] text-white sm:tracking-[0.24em]">
          <span className="block text-[0.95rem] sm:text-lg lg:text-xl">
            ASTRA{" "}
            <span className="text-amber-400">MOTORS</span>
          </span>
        </p>
        <div className="mt-2.5 h-px w-10 bg-amber-500/35 sm:w-12" aria-hidden />
        <p className="mt-2.5 max-w-[16rem] text-[10px] font-normal uppercase leading-relaxed tracking-[0.14em] text-slate-500 sm:max-w-none sm:text-[11px] sm:tracking-[0.16em]">
          Автозапчасти GM
          <span className="text-slate-600"> · </span>
          <span className="font-normal normal-case tracking-normal text-slate-400">Opel & Chevrolet</span>
        </p>
      </div>
    </div>
  );
}
