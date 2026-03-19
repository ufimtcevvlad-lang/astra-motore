import type { Metadata } from "next";
import { TelegramLoginWidget } from "../../components/auth/TelegramLoginWidget";

export const metadata: Metadata = {
  title: "Вход через Telegram",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TelegramAuthPage() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Вход через Telegram</h1>
      <TelegramLoginWidget />
    </div>
  );
}

