"use client";

import { useEffect, useState } from "react";

export function TelegramLoginWidget() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://astramotors.shop";
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [widgetKey, setWidgetKey] = useState(0);
  const [containerId] = useState(() => "tg-widget-container");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/telegram/me")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setBotUsername(typeof data?.username === "string" ? data.username : null);
      })
      .catch(() => {
        if (!active) return;
        setBotUsername(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    // Telegram Login Widget требует "настоящий" <script> с data-атрибутами.
    // Поэтому добавляем его вручную в контейнер.
    if (!botUsername) return;
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
    setWidgetKey((k) => k + 1);
  }, [botUsername, siteUrl, containerId]);

  if (loading) {
    return <p className="text-sm text-slate-600">Загрузка входа Telegram...</p>;
  }

  if (!botUsername) {
    return (
      <p className="text-sm text-amber-700">
        Не удалось получить username Telegram-бота. Проверьте переменные окружения (
        `TELEGRAM_BOT_TOKEN`) и перезапустите сервер.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Нажмите кнопку Telegram и подтвердите вход в аккаунте мессенджера.
      </p>
      <div id={containerId} key={widgetKey} />
    </div>
  );
}

