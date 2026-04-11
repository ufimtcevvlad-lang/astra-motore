"use client";

import { useState } from "react";

export function ShareButton({ title, url }: { title: string; url: string }) {
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const fullUrl = window.location.origin + url;
    if (navigator.share) {
      try {
        await navigator.share({ title, url: fullUrl });
        return;
      } catch {
        // user cancelled or API error — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(fullUrl);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={shared ? "Ссылка скопирована" : "Поделиться"}
      title={shared ? "Ссылка скопирована!" : "Поделиться"}
      className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
    >
      {shared ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className="text-green-500"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      )}
    </button>
  );
}
