"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

export const COOKIE_CONSENT_KEY = "am-cookie-consent";
export const COOKIE_CONSENT_EVENT = "am-cookie-consent-changed";

export type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export function readConsent(): CookieConsent | null {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!value) return null;
    if (value === "all") return { necessary: true, analytics: true, marketing: true };
    if (value === "necessary") return { necessary: true, analytics: false, marketing: false };
    const parsed = JSON.parse(value) as CookieConsent;
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
  const consent = useSyncExternalStore(
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
    () => readConsent(),
    () => null
  );
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
      <div className="mx-auto max-w-7xl space-y-3 px-4 py-3">
        <p className="text-sm text-slate-700">
          Мы используем файлы cookies для корректной работы сайта и аналитики. Продолжая пользоваться сайтом, вы
          можете выбрать режим использования файлов cookies.
          {" "}
          <Link href="/cookie-policy" className="font-medium text-amber-700 underline hover:text-amber-800">
            Подробнее в политике cookies
          </Link>
          .
        </p>
        <div className="flex flex-wrap shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setConfigureOpen((v) => !v)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Настроить
          </button>
          <button
            type="button"
            onClick={acceptNecessary}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Только необходимые
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-md bg-amber-700 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Принять все
          </button>
        </div>
        {configureOpen ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2 text-sm">
                <span>Необходимые</span>
                <input type="checkbox" checked disabled className="h-4 w-4 rounded border-slate-300" />
              </label>
              <label className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2 text-sm">
                <span>Аналитика</span>
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </label>
              <label className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white p-2 text-sm">
                <span>Маркетинг</span>
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
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
