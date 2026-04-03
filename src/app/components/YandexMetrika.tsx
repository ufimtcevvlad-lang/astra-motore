"use client";

import { useEffect } from "react";

/** ID счётчика: metrika.yandex.ru → Настройки → Код счётчика. На проде задайте NEXT_PUBLIC_YANDEX_METRIKA_ID в .env.local */
const COUNTER_ID = (() => {
  const n = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID);
  return Number.isFinite(n) && n > 0 ? n : 108384071;
})();

const TAG_JS_SRC = `https://mc.yandex.ru/metrika/tag.js?id=${COUNTER_ID}`;

const isDev = process.env.NODE_ENV === "development";

function log(...args: unknown[]) {
  if (isDev) console.info("[metrika]", ...args);
}

export function YandexMetrika() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const w = window as Window & { ym?: (...args: unknown[]) => void };

    log("component mounted");

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${TAG_JS_SRC}"]`,
    );
    if (existing) {
      log("tag.js already present in DOM");
    }

    (function (
      m: Window & { ym?: (...args: unknown[]) => void },
      e: Document,
      t: string,
      r: string,
      i: string
    ) {
      const mm = m as unknown as Record<string, unknown>;
      mm[i] =
        mm[i] ||
        function (...args: unknown[]) {
          const fn = mm[i] as { a?: unknown[] };
          (fn.a = fn.a || []).push(args);
        };
      (mm[i] as { l: number }).l = Date.now();

      const k = e.createElement(t) as HTMLScriptElement;
      k.async = true;
      k.src = r;
      k.onload = () => log("tag.js loaded");
      k.onerror = () =>
        console.error(
          "[metrika] tag.js failed to load (blocked / network / policy)",
          r
        );

      const a = e.getElementsByTagName(t)[0] as HTMLElement | undefined;
      if (a?.parentNode) a.parentNode.insertBefore(k, a);
      else e.head.appendChild(k);
    })(w, document, "script", TAG_JS_SRC, "ym");

    const tryInit = () => {
      if (typeof w.ym === "function") {
        log("ym() is available, calling init()");
        const dl = w as Window & { dataLayer?: unknown[] };
        dl.dataLayer = dl.dataLayer ?? [];
        w.ym(COUNTER_ID, "init", {
          ssr: true,
          webvisor: true,
          clickmap: true,
          ecommerce: "dataLayer",
          referrer: document.referrer,
          url: location.href,
          accurateTrackBounce: true,
          trackLinks: true,
        });
        return true;
      }
      return false;
    };

    if (!tryInit()) {
      const t = setInterval(() => {
        if (tryInit()) clearInterval(t);
      }, 100);
      const timeout = setTimeout(() => clearInterval(t), 10000);
      return () => {
        clearInterval(t);
        clearTimeout(timeout);
      };
    }
  }, []);

  return (
    <noscript>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://mc.yandex.ru/watch/${COUNTER_ID}`}
          style={{ position: "absolute", left: "-9999px" }}
          alt=""
        />
      </div>
    </noscript>
  );
}
