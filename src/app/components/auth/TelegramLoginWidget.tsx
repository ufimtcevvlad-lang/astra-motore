"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

export function TelegramLoginWidget() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://astramotors.shop";
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      <Script
        src="https://telegram.org/js/telegram-widget.js?22"
        strategy="afterInteractive"
        data-telegram-login={botUsername}
        data-size="large"
        data-radius="8"
        data-auth-url={`${siteUrl}/api/auth/social/telegram/callback`}
        data-request-access="write"
      />
    </div>
  );
}

