"use client";

import Link from "next/link";
import { useState } from "react";

export const COOKIE_CONSENT_KEY = "am-cookie-consent";
export const COOKIE_CONSENT_EVENT = "am-cookie-consent-changed";

type CookieConsentMode = "all" | "necessary";

function readConsent(): CookieConsentMode | null {
  try {
    const value = localStorage.getItem(COOKIE_CONSENT_KEY);
    return value === "all" || value === "necessary" ? value : null;
  } catch {
    return null;
  }
}

function saveConsent(mode: CookieConsentMode): void {
  try {
    localStorage.setItem(COOKIE_CONSENT_KEY, mode);
  } catch {
    // ignore write errors
  }
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: mode }));
}

export function CookieConsentBanner() {
  const [show, setShow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return readConsent() === null;
  });

  if (!show) return null;

  const acceptNecessary = () => {
    saveConsent("necessary");
    setShow(false);
  };

  const acceptAll = () => {
    saveConsent("all");
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[120] border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700">
          Мы используем файлы cookies для корректной работы сайта и аналитики. Продолжая пользоваться сайтом, вы
          можете выбрать режим использования файлов cookies.
          {" "}
          <Link href="/cookie-policy" className="font-medium text-amber-700 underline hover:text-amber-800">
            Подробнее в политике cookies
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center gap-2">
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
            className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Принять все
          </button>
        </div>
      </div>
    </div>
  );
}
