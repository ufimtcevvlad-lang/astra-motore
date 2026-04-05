"use client";

/**
 * Логотип шапки: единый растровый локап GM SHOP (GENERAL MOTORS / OPEL · CHEVROLET / 66).
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center py-0.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- полный локап из макета, без next/image crop */}
      <img
        src="/brand/gm-shop-logo.jpg"
        alt=""
        draggable={false}
        loading="eager"
        decoding="async"
        className="h-9 w-auto max-w-[min(52vw,220px)] object-contain object-left sm:h-11 sm:max-w-[min(48vw,260px)] md:h-[3.35rem] md:max-w-[min(42vw,300px)]"
        style={{
          filter:
            "drop-shadow(0 0 14px rgba(251,191,36,0.18)) drop-shadow(0 0 1px rgba(251,191,36,0.12))",
        }}
      />
    </div>
  );
}
