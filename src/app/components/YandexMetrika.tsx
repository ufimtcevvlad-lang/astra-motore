"use client";

import { useEffect } from "react";

/** ID счётчика из metrika.yandex.ru → Настройки → Код счётчика */
const COUNTER_ID = 107737371;

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
      'script[src="https://mc.yandex.ru/metrika/tag.js"]'
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
    })(w, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

    const tryInit = () => {
      if (typeof w.ym === "function") {
        log("ym() is available, calling init()");
        w.ym(COUNTER_ID, "init", {
          clickmap: true,
          trackLinks: true,
          accurateTrackBounce: true,
          webvisor: true,
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
