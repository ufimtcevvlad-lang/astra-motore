"use client";

import { useMemo } from "react";

export function TelegramLoginWidget({ botUsername }: { botUsername: string }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://astramotors.shop";
  const authUrl = `${siteUrl}/api/auth/social/telegram/callback`;

  // Надежный способ: отдаем embed страницу через наш прокси `/embed/<bot>`.
  // Это обходит ситуацию, когда `telegram-widget.js` не создает кнопку.
  const iframeSrc = useMemo(() => {
    const origin = siteUrl;
    const returnTo = `${siteUrl}/auth/telegram`;
    const params = new URLSearchParams({
      origin,
      return_to: returnTo,
      size: "large",
      request_access: "write",
      radius: "8",
    });
    return `${siteUrl}/embed/${botUsername}?${params.toString()}`;
  }, [siteUrl, botUsername]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Нажмите кнопку Telegram и подтвердите вход в аккаунте мессенджера.
      </p>

      <iframe
        title="Telegram Login"
        src={iframeSrc}
        style={{
          width: "100%",
          // В embed-странице виджет/кнопка может находиться ниже, поэтому фиксируем высоту больше.
          height: 260,
          border: 0,
          borderRadius: 12,
          overflow: "hidden",
          background: "transparent",
        }}
      />

      <p className="text-xs text-slate-500 break-all">
        bot: {botUsername} • auth-url: {authUrl}
      </p>
    </div>
  );
}

