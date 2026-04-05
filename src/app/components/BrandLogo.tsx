"use client";

/**
 * Логотип шапки: единый растровый локап GM SHOP (GENERAL MOTORS / OPEL · CHEVROLET / 66).
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center py-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- полный локап из макета, без next/image crop */}
      <img
        src="/brand/gm-shop-logo.jpg"
        alt=""
        draggable={false}
        loading="eager"
        decoding="async"
        className="h-[6.75rem] w-auto max-w-[min(96vw,640px)] object-contain object-left sm:h-[8rem] sm:max-w-[min(94vw,720px)] md:h-[9.75rem] md:max-w-[min(92vw,800px)] lg:h-[10.5rem]"
      />
    </div>
  );
}
