"use client";

import Image from "next/image";

/**
 * Логотип шапки: фирменный знак (шестерня + AM) в PNG @2×, без текстового блока.
 * Файл: `public/brand/astra-mark.png` (янтарь/золото + красный акцент, прозрачный фон).
 */
export function BrandLogo() {
  return (
    <div
      className="relative flex aspect-square h-[4.25rem] w-[4.25rem] shrink-0 items-center justify-center sm:h-20 sm:w-20 md:h-[5.5rem] md:w-[5.5rem] drop-shadow-[0_0_24px_rgba(251,191,36,0.3)] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_32px_rgba(251,191,36,0.45)]"
      aria-hidden
    >
      <Image
        src="/brand/astra-mark.png"
        alt=""
        width={1024}
        height={1024}
        priority
        sizes="(max-width: 768px) 4.25rem, (max-width: 1024px) 5rem, 5.5rem"
        className="h-full w-full object-contain p-0.5"
      />
    </div>
  );
}
