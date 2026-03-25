"use client";

import { useEffect, useRef } from "react";

/**
 * Логотип шапки: растровый знак (PNG @2×) + типографика.
 * Цвета подбираются скриптом `scripts/build-astra-mark.py` под `amber-400` (#fbbf24).
 */
export function BrandLogo() {
  const signWrapRef = useRef<HTMLDivElement | null>(null);
  const squareRef = useRef<HTMLDivElement | null>(null);

  // Debug marker to verify the server served the latest code.
  const BRAND_LOGO_CODE_VERSION = "clip-debug-v1";

  useEffect(() => {
    const wrap = signWrapRef.current;
    if (!wrap) return;

    requestAnimationFrame(() => {
      const square = squareRef.current;
      const img = wrap.querySelector("img") as HTMLImageElement | null;

      const signWrapRect = wrap.getBoundingClientRect();
      const squareRect = square?.getBoundingClientRect();
      const imgRect = img?.getBoundingClientRect();

      const rectToPlain = (r: DOMRect | undefined) => {
        if (!r) return null;
        return {
          top: r.top,
          left: r.left,
          bottom: r.bottom,
          right: r.right,
          width: r.width,
          height: r.height,
        };
      };

      const squareOverflow = square ? getComputedStyle(square).overflow : null;
      const wrapOverflow = getComputedStyle(wrap).overflow;

      // Check only a few parents to keep log size small.
      const ancestors: Array<{
        tag: string;
        overflow: string;
        overflowX: string;
        overflowY: string;
        height: number;
      }> = [];

      let el: HTMLElement | null = wrap.parentElement;
      let depth = 0;
      while (el && depth < 5) {
        const cs = getComputedStyle(el);
        ancestors.push({
          tag: el.tagName,
          overflow: cs.overflow,
          overflowX: cs.overflowX,
          overflowY: cs.overflowY,
          height: el.getBoundingClientRect().height,
        });
        el = el.parentElement;
        depth += 1;
      }

      // #region agent log
      fetch("http://127.0.0.1:7653/ingest/caf9f3ed-65b2-482a-808c-53e4b2430d1b", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "1f73bd",
        },
        body: JSON.stringify({
          sessionId: "1f73bd",
          id: `log_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          runId: "pre-fix",
          hypothesisId: "H1_layout_clipping_bounds_or_overflow",
          location:
            "src/app/components/BrandLogo.tsx:useEffect(layout+overflow probes)",
          message: "Measure sign container vs img bounding boxes",
          data: {
            codeVersion: BRAND_LOGO_CODE_VERSION,
            viewport: {
              w: window.innerWidth,
              h: window.innerHeight,
              dpr: window.devicePixelRatio,
            },
            signWrapRect: rectToPlain(signWrapRect),
            squareRect: rectToPlain(squareRect),
            imgRect: rectToPlain(imgRect),
            overflow: {
              wrapOverflow,
              squareOverflow,
            },
            ancestors,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
    });
  }, []);

  return (
    <div className="flex min-w-0 items-center gap-2.5 sm:gap-5 md:gap-6">
      <div
        ref={signWrapRef}
        className="relative flex shrink-0 items-center justify-center overflow-visible -translate-y-0.5 drop-shadow-[0_0_24px_rgba(251,191,36,0.3)] transition-[filter] duration-300 group-hover:drop-shadow-[0_0_32px_rgba(251,191,36,0.45)]"
        aria-hidden
      >
        {/* Внешний квадрат чуть больше; знак внутри ~72% — запас по краям, без «среза» снизу */}
        <div className="relative flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center overflow-visible sm:h-[5.25rem] sm:w-[5.25rem] md:h-[6rem] md:w-[6rem]">
          <div ref={squareRef} className="relative h-[72%] w-[72%] min-h-0 min-w-0">
            <img
              src="/brand/astra-mark.png"
              alt=""
              draggable={false}
              className="h-full w-full object-contain object-center"
              onLoad={(e) => {
                const img = e.currentTarget;

                // Sample transparency at top/bottom bands to see whether PNG has internal clipping.
                const canvas = document.createElement("canvas");
                canvas.width = 128;
                canvas.height = 128;
                const ctx = canvas.getContext("2d");

                let alphaBottom = null as boolean | null;
                let alphaTop = null as boolean | null;

                if (ctx) {
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                  const data =
                    ctx.getImageData(0, 0, canvas.width, canvas.height).data;

                  const w = canvas.width;
                  const h = canvas.height;
                  const alphaThreshold = 10;
                  const bottomStart = Math.floor(h * 0.95);
                  const topEnd = Math.floor(h * 0.05);

                  let hasBottom = false;
                  let hasTop = false;
                  for (let y = 0; y < h; y += 2) {
                    const rowHas = y >= bottomStart || y <= topEnd;
                    if (!rowHas) continue;
                    for (let x = 0; x < w; x += 2) {
                      const a = data[(y * w + x) * 4 + 3];
                      if (a > alphaThreshold) {
                        if (y <= topEnd) hasTop = true;
                        if (y >= bottomStart) hasBottom = true;
                        if (hasTop && hasBottom) break;
                      }
                    }
                    if (hasTop && hasBottom) break;
                  }

                  alphaTop = hasTop;
                  alphaBottom = hasBottom;
                }

                // #region agent log
                fetch(
                  "http://127.0.0.1:7653/ingest/caf9f3ed-65b2-482a-808c-53e4b2430d1b",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-Debug-Session-Id": "1f73bd",
                    },
                    body: JSON.stringify({
                      sessionId: "1f73bd",
                      id: `log_${Date.now()}_${Math.random()
                        .toString(16)
                        .slice(2)}`,
                      runId: "pre-fix",
                      hypothesisId:
                        "H2_png_internal_clipping_or_asset_old_variant",
                      location:
                        "src/app/components/BrandLogo.tsx:onLoad(png edge alpha probe)",
                      message: "Inspect loaded logo image + transparency at edges",
                      data: {
                        codeVersion: BRAND_LOGO_CODE_VERSION,
                        currentSrc: img.currentSrc,
                        naturalWidth: img.naturalWidth,
                        naturalHeight: img.naturalHeight,
                        alphaTop,
                        alphaBottom,
                      },
                      timestamp: Date.now(),
                    }),
                  }
                ).catch(() => {});
                // #endregion
              }}
            />
          </div>
        </div>
      </div>

      <div className="min-w-0 select-none">
        <div className="inline-block w-fit max-w-full">
          <p className="font-semibold uppercase leading-[1.05] tracking-[0.14em] text-white sm:tracking-[0.2em]">
            <span className="block whitespace-nowrap text-[0.95rem] sm:text-xl md:text-2xl">
              ASTRA <span className="text-amber-400">MOTORS</span>
            </span>
          </p>
          <div className="mt-1.5 h-px w-full bg-amber-400/55 sm:mt-2.5" aria-hidden />
        </div>
        <p className="mt-1.5 max-w-[15rem] text-[9px] font-medium uppercase leading-relaxed tracking-[0.11em] text-slate-400 sm:mt-2.5 sm:max-w-none sm:text-xs md:text-[0.8125rem] md:tracking-[0.16em]">
          Автозапчасти GM
          <span className="text-slate-500"> · </span>
          <span className="font-normal normal-case tracking-normal text-slate-500">
            Opel & Chevrolet
          </span>
        </p>
      </div>
    </div>
  );
}
