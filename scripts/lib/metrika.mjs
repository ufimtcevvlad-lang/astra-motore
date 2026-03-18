export function formatDateInTZ(date, timeZone) {
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

export function getYesterdayDateString(timeZone) {
  const now = new Date();
  const todayStr = formatDateInTZ(now, timeZone);
  const [y, m, d] = todayStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return formatDateInTZ(utc, timeZone);
}

export function secondsToHhMmSs(totalSeconds) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) return `${hh}ч ${String(mm).padStart(2, "0")}м`;
  return `${mm}м ${String(ss).padStart(2, "0")}с`;
}

export async function fetchMetrikaSummary({ oauthToken, counterId, date1, date2 }) {
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

