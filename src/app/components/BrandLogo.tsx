"use client";

/**
 * Логотип шапки: единый растровый локап GM SHOP (GENERAL MOTORS / OPEL · CHEVROLET / 66).
 * Линейный масштаб от базовых высот макета: 0.9 (= 0.75 + 0.15). Отступы шапки не меняются.
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center py-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- растровый локап; PNG с фоном под шапку (#05070A), без next/image crop */}
      <img
        src="/brand/gm-shop-logo-header.png"
        alt=""
        draggable={false}
        loading="eager"
        decoding="async"
        className="h-[calc(6.75rem*0.9)] w-auto max-w-[min(96vw,calc(640px*0.9))] object-contain object-left sm:h-[calc(8rem*0.9)] sm:max-w-[min(94vw,calc(720px*0.9))] md:h-[calc(9.75rem*0.9)] md:max-w-[min(92vw,calc(800px*0.9))] lg:h-[calc(10.5rem*0.9)]"
      />
    </div>
  );
}
