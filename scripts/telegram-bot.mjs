import fs from "node:fs/promises";
import path from "node:path";

import { loadDotEnvLocalFromCwd, requireEnv } from "./lib/env.mjs";
import { parseSkuList, writeImportWorkbook } from "./lib/stock-import.mjs";
import {
  fetchMetrikaSummary,
  formatDateInTZ,
  getYesterdayDateString,
  secondsToHhMmSs,
} from "./lib/metrika.mjs";

loadDotEnvLocalFromCwd();

const BOT_TOKEN = requireEnv("TELEGRAM_BOT_TOKEN");
const ADMIN_CHAT_ID = Number(process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID);
const METRIKA_TOKEN = requireEnv("YANDEX_METRIKA_OAUTH_TOKEN");
const COUNTER_ID = process.env.YANDEX_METRIKA_COUNTER_ID || "108384071";
const TZ = process.env.REPORT_TIMEZONE || "Asia/Yekaterinburg";

const ORDERS_FILE = path.join(process.cwd(), "data", "orders.ndjson");
const STOCK_DIR = path.join(process.cwd(), "data", "import-stock");
const STOCK_FILE = path.join(STOCK_DIR, "latest-stock.xlsx");
const IMPORT_OUTPUT_DIR = path.join(STOCK_DIR, "outputs");

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sameDateInTz(iso, dateStr, tz) {
  if (!iso) return false;
  return formatDateInTZ(new Date(iso), tz) === dateStr;
}

async function readOrders() {
  try {
    const raw = await fs.readFile(ORDERS_FILE, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const orders = [];
    for (const line of lines) {
      try {
        orders.push(JSON.parse(line));
      } catch {
        // skip bad line
      }
    }
    return orders;
  } catch {
    return [];
  }
}

async function summarizeOrdersForDate(dateStr) {
  const orders = await readOrders();
  const filtered = orders.filter((o) => sameDateInTz(o.createdAt, dateStr, TZ));
  const count = filtered.length;
  const total = filtered.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
  return { count, total, orders: filtered };
}

async function getStatsTextForDate(dateStr) {
  const s = await fetchMetrikaSummary({
    oauthToken: METRIKA_TOKEN,
    counterId: COUNTER_ID,
    date1: dateStr,
    date2: dateStr,
  });

  return [
    "📊 <b>Метрика — " + escapeHtml(dateStr) + "</b>",
    "",
    "👥 <b>Посетители:</b> " + s.users.toLocaleString("ru-RU"),
    "🚪 <b>Визиты:</b> " + s.visits.toLocaleString("ru-RU"),
    "📄 <b>Просмотры:</b> " + s.pageviews.toLocaleString("ru-RU"),
    "⏱️ <b>Ср. время:</b> " + escapeHtml(secondsToHhMmSs(s.avgVisitDurationSeconds)),
    "↩️ <b>Отказы:</b> " + s.bounceRate.toFixed(2).replace(".", ",") + "%",
  ].join("\n");
}

function mainMenuKeyboard() {
  return {
    keyboard: [
      [{ text: "📊 Статистика сегодня" }, { text: "📊 Статистика вчера" }],
      [{ text: "🛒 Заказы сегодня" }, { text: "🛒 Заказы вчера" }],
      [{ text: "📦 Excel по артикулам" }],
      [{ text: "🧾 Последние 5 заказов" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

async function tg(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(`Telegram API error ${method}: ${data?.description || res.status}`);
  }
  return data.result;
}

async function tgForm(method, form) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(`Telegram API error ${method}: ${data?.description || res.status}`);
  }
  return data.result;
}

async function sendMessage(chatId, text, extra = {}) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

async function sendDocument(chatId, filePath, caption = "") {
  const buffer = await fs.readFile(filePath);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("document", blob, path.basename(filePath));
  if (caption) form.append("caption", caption);
  return tgForm("sendDocument", form);
}

async function saveStockDocument(document) {
  if (!document?.file_id) throw new Error("Не получил файл");
  const name = String(document.file_name ?? "").toLowerCase();
  if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
    throw new Error("Нужен Excel-файл .xlsx или .xls");
  }

  const file = await tg("getFile", { file_id: document.file_id });
  const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Не смог скачать файл из Telegram: HTTP ${res.status}`);

  await fs.mkdir(STOCK_DIR, { recursive: true });
  const bytes = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(STOCK_FILE, bytes);
  return { bytes: bytes.length };
}

async function stockExists() {
  try {
    const st = await fs.stat(STOCK_FILE);
    return st.isFile();
  } catch {
    return false;
  }
}

async function makeImportFromText(chatId, text) {
  const requested = parseSkuList(text);
  if (requested.length < 1) return false;
  if (!(await stockExists())) {
    await sendMessage(
      chatId,
      [
        "Сначала пришли мне Excel-файл остатков 1С (.xlsx).",
        "После этого просто отправляй список артикулов сообщением, каждый артикул с новой строки.",
      ].join("\n")
    );
    return true;
  }

  await fs.mkdir(IMPORT_OUTPUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = path.join(IMPORT_OUTPUT_DIR, `import-${stamp}.xlsx`);
  const result = writeImportWorkbook({ requested, stockPath: STOCK_FILE, outPath });

  await sendDocument(
    chatId,
    outPath,
    `Готово: найдено ${result.matches.length} из ${requested.length}, не найдено ${result.missing.length}.`
  );
  return true;
}

async function handleCommand(chatId, text) {
  const today = formatDateInTZ(new Date(), TZ);
  const yesterday = getYesterdayDateString(TZ);

  if (text === "/start" || text === "/menu" || text === "Меню") {
    await sendMessage(
      chatId,
      "Выбери действие кнопками ниже.",
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  if (text === "/import" || text === "📦 Excel по артикулам") {
    await sendMessage(
      chatId,
      [
        "Как пользоваться импортом:",
        "",
        "1. Пришли сюда свежий Excel-файл остатков 1С (.xlsx).",
        "2. Потом пришли список артикулов обычным сообщением.",
        "3. Я верну готовый Excel для импорта на сайт.",
        "",
        "Артикулы можно писать с пробелами, точками, тире — я ищу без них.",
      ].join("\n"),
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  if (text === "📊 Статистика сегодня") {
    await sendMessage(chatId, await getStatsTextForDate(today), { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (text === "📊 Статистика вчера") {
    await sendMessage(chatId, await getStatsTextForDate(yesterday), { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (text === "🛒 Заказы сегодня") {
    const s = await summarizeOrdersForDate(today);
    await sendMessage(
      chatId,
      [
        "🛒 <b>Заказы — сегодня (" + escapeHtml(today) + ")</b>",
        "",
        "📦 <b>Кол-во заказов:</b> " + s.count.toLocaleString("ru-RU"),
        "💰 <b>Сумма:</b> " + s.total.toLocaleString("ru-RU") + " ₽",
      ].join("\n"),
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  if (text === "🛒 Заказы вчера") {
    const s = await summarizeOrdersForDate(yesterday);
    await sendMessage(
      chatId,
      [
        "🛒 <b>Заказы — вчера (" + escapeHtml(yesterday) + ")</b>",
        "",
        "📦 <b>Кол-во заказов:</b> " + s.count.toLocaleString("ru-RU"),
        "💰 <b>Сумма:</b> " + s.total.toLocaleString("ru-RU") + " ₽",
      ].join("\n"),
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  if (text === "🧾 Последние 5 заказов") {
    const orders = await readOrders();
    const last = orders.slice(-5).reverse();
    if (last.length === 0) {
      await sendMessage(chatId, "Пока нет сохранённых заказов.", { reply_markup: mainMenuKeyboard() });
      return;
    }
    const blocks = last.map((o) => {
      const dt = o.createdAt ? new Date(o.createdAt) : null;
      const dateStr = dt ? formatDateInTZ(dt, TZ) : "—";
      const total = Number(o.total) || 0;
      return [
        "• <b>" + escapeHtml(dateStr) + "</b> — <b>" + total.toLocaleString("ru-RU") + " ₽</b>",
        "  👤 " + escapeHtml(o.name || "—") + " | 📞 " + escapeHtml(o.phone || "—"),
      ].join("\n");
    });
    await sendMessage(chatId, "🧾 <b>Последние заказы</b>\n\n" + blocks.join("\n\n"), {
      reply_markup: mainMenuKeyboard(),
    });
    return;
  }

  if (await makeImportFromText(chatId, text)) return;

  await sendMessage(chatId, "Не понял команду. Нажми /menu.", { reply_markup: mainMenuKeyboard() });
}

async function poll() {
  let offset = Number(process.env.TG_OFFSET || 0);
  for (;;) {
    const updates = await tg("getUpdates", {
      offset,
      timeout: 50,
      allowed_updates: ["message"],
    });

    for (const u of updates) {
      offset = Math.max(offset, (u.update_id || 0) + 1);
      const msg = u.message;
      if (!msg) continue;

      const chatId = msg.chat?.id;
      if (!chatId) continue;

      // Security: other commands respond only to admin chat
      if (ADMIN_CHAT_ID && Number(chatId) !== Number(ADMIN_CHAT_ID)) continue;

      try {
        if (msg.document) {
          const saved = await saveStockDocument(msg.document);
          await sendMessage(
            chatId,
            `Остатки 1С сохранены. Размер: ${(saved.bytes / 1024 / 1024).toFixed(1)} МБ.\nТеперь пришли список артикулов.`,
            { reply_markup: mainMenuKeyboard() }
          );
          continue;
        }

        if (!msg.text) continue;
        const text = msg.text.trim();
        await handleCommand(chatId, text);
      } catch (e) {
        await sendMessage(
          chatId,
          "Ошибка: " + escapeHtml(e instanceof Error ? e.message : String(e)),
          { reply_markup: mainMenuKeyboard() }
        );
      }
    }
  }
}

poll().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
