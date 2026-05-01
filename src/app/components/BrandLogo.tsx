"use client";

/**
 * Логотип шапки: растровый локап GM SHOP (GENERAL MOTORS / OPEL · CHEVROLET / 66).
 * Прежний визуальный размер (как при scale(1.2)), но без scale и overflow-visible —
 * контейнер сам растягивается под высоту логотипа, логотип не торчит на линию меню.
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center py-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- растровый локап; PNG с фоном под шапку #05070A */}
      <img
        src="/brand/gm-shop-logo-header.png"
        alt=""
        draggable={false}
        loading="eager"
        decoding="async"
        className="h-[76px] w-auto max-w-[min(76vw,360px)] origin-left object-contain object-left sm:h-[112px] sm:max-w-[min(94vw,620px)] md:h-[128px] md:max-w-[min(92vw,680px)] lg:h-[144px]"
      />
    </div>
  );
}
