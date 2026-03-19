"use client";

import Script from "next/script";

export function TelegramLoginWidget() {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://astramotors.shop";

  if (!botUsername) {
    return (
      <p className="text-sm text-amber-700">
        Telegram-вход пока не настроен. Добавьте `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` в `.env.local`.
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

