"use client";

import Image from "next/image";

/**
 * Логотип — готовый макет (шестерня + AM + ASTRA MOTORS + подпись) в палитре сайта.
 * Файл: public/brand/header-logo-preview.png
 */
const LOGO_SRC = "/brand/header-logo-preview.png";
const LOGO_W = 1376;
const LOGO_H = 768;

export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center">
      <Image
        src={LOGO_SRC}
        width={LOGO_W}
        height={LOGO_H}
        alt="Astra Motors — автозапчасти GM, Opel и Chevrolet"
        priority
        quality={92}
        className="h-10 w-auto max-w-[min(100%,280px)] object-contain object-left sm:h-12 sm:max-w-[min(100%,340px)] lg:h-[3.25rem] lg:max-w-[min(100%,400px)]"
        sizes="(max-width: 640px) 280px, (max-width: 1024px) 340px, 400px"
      />
    </div>
  );
}
