"use client";

import Image from "next/image";

/**
 * Логотип: знак из варианта 1 (шестерня + AM), без надписей с PNG —
 * нижняя часть картинки обрезается, текст справа — из стиля сайта.
 */
const MARK_SRC = "/brand/logo-options/logo-option-01-classic-gear.png";

export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center gap-3.5 sm:gap-5">
      {/* Только круглый знак: zoom + object-position, чтобы убрать ASTRA MOTORS с PNG */}
      <div
        className="relative h-[3.35rem] w-[3.35rem] shrink-0 overflow-hidden rounded-full shadow-[0_0_20px_rgba(251,191,36,0.22)] ring-1 ring-amber-400/35 transition-shadow duration-300 group-hover:shadow-[0_0_26px_rgba(251,191,36,0.35)] group-hover:ring-amber-300/50 sm:h-[3.75rem] sm:w-[3.75rem]"
        aria-hidden
      >
        <Image
          src={MARK_SRC}
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 54px, 60px"
          className="object-cover object-[50%_14%] scale-[2.15] logo-png-site-tint sm:object-[50%_12%] sm:scale-[2.05]"
        />
      </div>

      {/* Словесная часть сайта (не с PNG) */}
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
