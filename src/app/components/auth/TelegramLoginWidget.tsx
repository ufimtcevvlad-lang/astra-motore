"use client";

import { useEffect, useState } from "react";

export function TelegramLoginWidget({ botUsername }: { botUsername: string }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://astramotors.shop";
  const [containerId] = useState(() => "tg-widget-container");
  const authUrl = `${siteUrl}/api/auth/social/telegram/callback`;

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Удаляем предыдущий скрипт (если компонент перерендерился).
    const existing = document.getElementById("tg-widget-script");
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.id = "tg-widget-script";
    // Важно: отдаём виджет со своего домена, чтобы не зависеть от доступности telegram.org.
    script.src = `${siteUrl}/api/telegram/widget.js`;
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-auth-url", authUrl);
    script.setAttribute("data-request-access", "write");

    // Telegram виджет иногда корректнее рендерится, когда скрипт добавлен в body.
    document.body.appendChild(script);

    return () => {
      const s = document.getElementById("tg-widget-script");
      if (s) s.remove();
    };
  }, [botUsername, authUrl, containerId, siteUrl]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Нажмите кнопку Telegram и подтвердите вход в аккаунте мессенджера.
      </p>
      <div id={containerId} />
      <p className="text-xs text-slate-500 break-all">
        bot: {botUsername} • auth-url: {authUrl}
      </p>
    </div>
  );
}

