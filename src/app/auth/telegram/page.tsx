import type { Metadata } from "next";
import { TelegramLoginWidget } from "../../components/auth/TelegramLoginWidget";

export const metadata: Metadata = {
  title: "Вход через Telegram",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function TelegramAuthPage() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  let botUsername = "";

  if (token) {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    botUsername = typeof data?.result?.username === "string" ? data.result.username : "";
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Вход через Telegram</h1>
      {botUsername ? (
        <TelegramLoginWidget botUsername={botUsername} />
      ) : (
        <p className="text-sm text-amber-700">
          Не удалось получить username Telegram-бота. Проверьте переменные окружения (
          `TELEGRAM_BOT_TOKEN`).
        </p>
      )}
    </div>
  );
}

