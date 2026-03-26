"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_KEY } from "./CookieConsentBanner";

/** Метрика грузится отдельным чанком после гидрации — не блокирует первый экран. */
const YandexMetrika = dynamic(
  () => import("./YandexMetrika").then((m) => ({ default: m.YandexMetrika })),
  { ssr: false }
);

function hasAnalyticsConsent(): boolean {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return false;
    if (raw === "all") return true;
    if (raw === "necessary") return false;
    const parsed = JSON.parse(raw) as { analytics?: boolean };
    return Boolean(parsed.analytics);
  } catch {
    return false;
  }
}

export function MetrikaDeferred() {
  const enabled = useSyncExternalStore(
    (onStoreChange) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === COOKIE_CONSENT_KEY) onStoreChange();
      };
      const onCustom = () => onStoreChange();
      window.addEventListener("storage", onStorage);
      window.addEventListener(COOKIE_CONSENT_EVENT, onCustom);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(COOKIE_CONSENT_EVENT, onCustom);
      };
    },
    () => hasAnalyticsConsent(),
    () => false
  );

  return enabled ? <YandexMetrika /> : null;
}
