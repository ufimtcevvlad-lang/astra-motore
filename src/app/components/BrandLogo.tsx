"use client";

/**
 * Логотип шапки: единый растровый локап GM SHOP (GENERAL MOTORS / OPEL · CHEVROLET / 66).
 * Высота в потоке — как при коэфф. 0.75 (шапка не раздувается), визуально — 0.9 за счёт scale(0.9/0.75).
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center overflow-visible py-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- растровый локап; PNG с фоном под шапку (#05070A), без next/image crop */}
      <img
        src="/brand/gm-shop-logo-header.png"
        alt=""
        draggable={false}
        loading="eager"
        decoding="async"
        className="h-[calc(6.75rem*0.75)] w-auto max-w-[min(96vw,calc(640px*0.75))] origin-left scale-[1.2] object-contain object-left sm:h-[calc(8rem*0.75)] sm:max-w-[min(94vw,calc(720px*0.75))] md:h-[calc(9.75rem*0.75)] md:max-w-[min(92vw,calc(800px*0.75))] lg:h-[calc(10.5rem*0.75)]"
      />
    </div>
  );
}
