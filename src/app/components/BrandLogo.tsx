"use client";

/**
 * Логотип шапки: растровый локап GM SHOP (GENERAL MOTORS / OPEL · CHEVROLET / 66).
 * Без scale/overflow-visible — логотип строго в границах своей flex-ячейки,
 * не торчит на разделительную линию меню ниже.
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
        className="h-16 w-auto max-w-[320px] origin-left object-contain object-left sm:h-20 sm:max-w-[380px] md:h-24 md:max-w-[440px]"
      />
    </div>
  );
}
