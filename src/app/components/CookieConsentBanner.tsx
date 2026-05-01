"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

export const COOKIE_CONSENT_KEY = "am-cookie-consent";
export const COOKIE_CONSENT_EVENT = "am-cookie-consent-changed";

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

function normalizeConsentRaw(value: string | null): string | null {
  if (value === "all") return JSON.stringify({ necessary: true, analytics: true, marketing: true });
  if (value === "necessary") return JSON.stringify({ necessary: true, analytics: false, marketing: false });
  return value;
}

function readConsentRaw(): string | null {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    return normalizeConsentRaw(value);
  } catch {
    return null;
  }
}

export function readConsent(): CookieConsent | null {
  try {
    const raw = readConsentRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsent;
    if (typeof parsed?.analytics === "boolean" && typeof parsed?.marketing === "boolean") {
      return { necessary: true, analytics: parsed.analytics, marketing: parsed.marketing };
    }
    return null;
  } catch {
    return null;
  }
}

function saveConsent(consent: CookieConsent): void {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // ignore write errors
  }
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }));
}

export function CookieConsentBanner() {
  const consentRaw = useSyncExternalStore(
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
    () => readConsentRaw(),
    () => null
  );
  const consent = useMemo(() => {
    if (!consentRaw) return null;
    try {
      return JSON.parse(consentRaw) as CookieConsent;
    } catch {
      return null;
    }
  }, [consentRaw]);
  const show = consent === null;
  const [configureOpen, setConfigureOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  if (!show) return null;

  const acceptNecessary = () => {
    saveConsent({ necessary: true, analytics: false, marketing: false });
  };

  const acceptAll = () => {
    saveConsent({ necessary: true, analytics: true, marketing: true });
  };
  const saveCustom = () => {
    saveConsent({ necessary: true, analytics, marketing });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-3">
        <p className="text-xs leading-snug text-slate-700 sm:text-sm">
          Используем cookies для работы сайта и аналитики.
          {" "}
          <Link href="/cookie-policy" className="font-medium text-amber-700 underline hover:text-amber-800">
            Подробнее
          </Link>
          .
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setConfigureOpen((v) => !v)}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 sm:text-sm"
          >
            Настроить
          </button>
          <button
            type="button"
            onClick={acceptNecessary}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 sm:text-sm"
          >
            Только необходимые
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-md bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800 sm:text-sm"
          >
            Принять все
          </button>
        </div>
        {configureOpen ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 sm:absolute sm:bottom-full sm:right-4 sm:mb-2 sm:w-[520px]">
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2 text-sm">
                <span>Необходимые</span>
                <input type="checkbox" checked disabled className="h-4 w-4 rounded border-slate-300 accent-amber-500" />
              </label>
              <label className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2 text-sm">
                <span>Аналитика</span>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-amber-500"
                />
              </label>
              <label className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2 text-sm">
                <span>Маркетинг</span>
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-amber-500"
                />
              </label>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={saveCustom}
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Сохранить выбор
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
