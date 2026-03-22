"use client";

import Image from "next/image";

/**
 * Логотип шапки: PNG-знак (шестерня + AM) + типографика.
 * Файл: `public/brand/astra-mark.png`
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center gap-3.5 sm:gap-5 md:gap-6">
      {/* Знак: padding + overflow-visible, чтобы круг и drop-shadow не «съедались» */}
      <div
        className="relative box-content flex shrink-0 items-center justify-center overflow-visible py-1 sm:py-1.5 drop-shadow-[0_0_24px_rgba(251,191,36,0.3)] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_32px_rgba(251,191,36,0.45)]"
        aria-hidden
      >
        <div className="relative h-[3.75rem] w-[3.75rem] overflow-visible sm:h-[4.5rem] sm:w-[4.5rem] md:h-[5rem] md:w-[5rem]">
          <Image
            src="/brand/astra-mark.png"
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 3.75rem, (max-width: 1024px) 4.5rem, 5rem"
            className="object-contain object-center p-[12%]"
          />
        </div>
      </div>

      <div className="min-w-0 select-none">
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
