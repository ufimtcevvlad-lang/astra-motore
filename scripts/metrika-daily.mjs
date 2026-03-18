function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDateInTZ(date, timeZone) {
  // YYYY-MM-DD
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function getYesterdayDateString(timeZone) {
  const now = new Date();
  // "Вчера" в нужном TZ: берём дату "сегодня" в TZ, затем -1 день по UTC (достаточно для отчётных дат)
  const todayStr = formatDateInTZ(now, timeZone);
  const [y, m, d] = todayStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return formatDateInTZ(utc, timeZone);
}

function secondsToHhMmSs(totalSeconds) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) return `${hh}ч ${String(mm).padStart(2, "0")}м`;
  return `${mm}м ${String(ss).padStart(2, "0")}с`;
}

async function fetchMetrikaSummary({ oauthToken, counterId, date1, date2 }) {
  const metrics = [
    "ym:s:visits",
    "ym:s:users",
    "ym:s:pageviews",
    "ym:s:bounceRate",
    "ym:s:avgVisitDurationSeconds",
  ].join(",");

  const url = new URL("https://api-metrika.yandex.net/stat/v1/data");
  url.searchParams.set("ids", String(counterId));
  url.searchParams.set("metrics", metrics);
  url.searchParams.set("date1", date1);
  url.searchParams.set("date2", date2);
  url.searchParams.set("accuracy", "full");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `OAuth ${oauthToken}`,
    },
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Metrika API returned non-JSON (status ${res.status})`);
  }

  if (!res.ok) {
    const msg = data?.message || data?.errors?.[0]?.message || text;
    throw new Error(`Metrika API error ${res.status}: ${msg}`);
  }

  const totals = Array.isArray(data?.totals) ? data.totals : null;
  if (!totals || totals.length < 5) {
    throw new Error("Metrika API: unexpected response shape (no totals)");
  }

  const [visits, users, pageviews, bounceRate, avgVisitDurationSeconds] = totals;
  return {
    visits: Number(visits) || 0,
    users: Number(users) || 0,
    pageviews: Number(pageviews) || 0,
    bounceRate: Number(bounceRate) || 0,
    avgVisitDurationSeconds: Number(avgVisitDurationSeconds) || 0,
  };
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
