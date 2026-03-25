"use client";

import Image from "next/image";

/**
 * Логотип шапки: растровый знак (PNG @2×) + типографика.
 * Цвета подбираются скриптом `scripts/build-astra-mark.py` под `amber-400` (#fbbf24).
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center">
      <div
        className="relative flex shrink-0 items-center justify-center overflow-visible py-0.5 drop-shadow-[0_0_24px_rgba(251,191,36,0.3)] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_32px_rgba(251,191,36,0.45)]"
        aria-hidden
      >
        {/* Padding переносим на контейнер, а не на сам <img/>: с `fill` это избавляет от визуального «среза» снизу */}
        <div className="relative h-[3.25rem] w-[3.25rem] overflow-visible p-[16%] sm:h-20 sm:w-20 md:h-[5.5rem] md:w-[5.5rem]">
          <Image
            src="/brand/astra-mark.png"
            alt=""
            fill
            priority
            quality={100}
            sizes="(max-width: 768px) 3.25rem, (max-width: 1024px) 5rem, 5.5rem"
            className="object-contain object-center"
          />
        </div>
      </div>
    </div>
  );
}
