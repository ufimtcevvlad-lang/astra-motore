"use client";

import { useEffect, useState } from "react";

export function TelegramLoginWidget({ botUsername }: { botUsername: string }) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://astramotors.shop";
  const [containerId] = useState(() => "tg-widget-container");

  useEffect(() => {
    // Telegram Login Widget требует "настоящий" <script> с data-атрибутами.
    // Поэтому добавляем его вручную в контейнер.
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-auth-url", `${siteUrl}/api/auth/social/telegram/callback`);
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);
  }, [botUsername, siteUrl, containerId]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Нажмите кнопку Telegram и подтвердите вход в аккаунте мессенджера.
      </p>
      <div id={containerId} />
    </div>
  );
}

