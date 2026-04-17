"use client";

import { useEffect } from "react";

const PREFIX = "admin.products.scroll.";

export function saveScroll(key: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PREFIX + key, String(window.scrollY));
  } catch {
    /* ignore */
  }
}

export function useScrollRestore(key: string, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    if (typeof window === "undefined") return;
    let y = 0;
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      y = raw ? Number(raw) : 0;
    } catch {
      /* ignore */
    }
    if (y > 0) {
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [key, ready]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHide = () => saveScroll(key);
    window.addEventListener("beforeunload", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [key]);
}
