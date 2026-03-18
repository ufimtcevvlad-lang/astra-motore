import { loadDotEnvLocalFromCwd, requireEnv } from "./lib/env.mjs";
import {
  fetchMetrikaSummary,
  getYesterdayDateString,
  secondsToHhMmSs,
} from "./lib/metrika.mjs";

loadDotEnvLocalFromCwd();

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendTelegramMessage({ token, chatId, text }) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(`Telegram error: ${data?.description || res.status}`);
  }
}

async function main() {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const chatId = requireEnv("TELEGRAM_CHAT_ID");
  const oauthToken = requireEnv("YANDEX_METRIKA_OAUTH_TOKEN");
  const counterId = process.env.YANDEX_METRIKA_COUNTER_ID || "107737371";

  const tz = process.env.REPORT_TIMEZONE || "Europe/Moscow";
  const date = process.env.REPORT_DATE || getYesterdayDateString(tz);

  const summary = await fetchMetrikaSummary({
    oauthToken,
    counterId,
    date1: date,
    date2: date,
  });

  const lines = [
    "📊 <b>Метрика — сводка за " + escapeHtml(date) + "</b>",
    "",
    "👥 <b>Посетители:</b> " + summary.users.toLocaleString("ru-RU"),
    "🚪 <b>Визиты:</b> " + summary.visits.toLocaleString("ru-RU"),
    "📄 <b>Просмотры:</b> " + summary.pageviews.toLocaleString("ru-RU"),
    "⏱️ <b>Ср. время:</b> " + escapeHtml(secondsToHhMmSs(summary.avgVisitDurationSeconds)),
    "↩️ <b>Отказы:</b> " + summary.bounceRate.toFixed(2).replace(".", ",") + "%",
  ];

  await sendTelegramMessage({ token, chatId, text: lines.join("\n") });
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
