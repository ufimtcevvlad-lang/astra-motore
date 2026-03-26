"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY } from "./CookieConsentBanner";

/** Метрика грузится отдельным чанком после гидрации — не блокирует первый экран. */
const YandexMetrika = dynamic(
  () => import("./YandexMetrika").then((m) => ({ default: m.YandexMetrika })),
  { ssr: false }
);

function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(COOKIE_CONSENT_KEY) === "all";
  } catch {
    return false;
  }
}

export function MetrikaDeferred() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return hasAnalyticsConsent();
  });

  useEffect(() => {
    const onConsentChanged = () => setEnabled(hasAnalyticsConsent());
    const onStorage = (event: StorageEvent) => {
      if (event.key === COOKIE_CONSENT_KEY) setEnabled(event.newValue === "all");
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return enabled ? <YandexMetrika /> : null;
}
