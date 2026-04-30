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
const BTN_UPLOAD_STOCK = "1. Загрузить остатки 1С";
const BTN_MAKE_IMPORT = "2. Сделать Excel по артикулам";
const BTN_STOCK_STATUS = "Проверить файл остатков";
const BTN_HELP = "Как пользоваться";
const BTN_MENU = "Главное меню";

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
      [{ text: BTN_UPLOAD_STOCK }],
      [{ text: BTN_MAKE_IMPORT }],
      [{ text: BTN_STOCK_STATUS }, { text: BTN_HELP }],
      [{ text: "Статистика сегодня" }, { text: "Заказы сегодня" }],
      [{ text: "Последние 5 заказов" }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

function importHelpText() {
  return [
    "<b>Подготовка Excel для импорта товаров</b>",
    "",
    "<b>Шаг 1.</b> Нажмите кнопку «1. Загрузить остатки 1С».",
    "Потом отправьте сюда Excel-файл остатков из 1С.",
    "",
    "<b>Шаг 2.</b> Нажмите кнопку «2. Сделать Excel по артикулам».",
    "Потом отправьте список артикулов обычным сообщением.",
    "",
    "<b>Пример списка:</b>",
    "<code>13257840",
    "PPK10595",
    "13 171 805",
    "801-833-XQ17</code>",
    "",
    "Бот сам найдёт товары в остатках и пришлёт готовый Excel для сайта.",
    "Пробелы, точки, тире и слэши в артикулах можно не вычищать.",
  ].join("\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function userErrorMessage(err) {
  const message = err instanceof Error ? err.message : String(err);
  if (/fetch failed|Connect Timeout|UND_ERR|network|timeout/i.test(message)) {
    return [
      "Telegram временно не отвечает.",
      "Попробуйте нажать кнопку или отправить файл ещё раз через 1-2 минуты.",
    ].join("\n");
  }
  return message;
}

async function fetchWithRetry(url, options = {}, attempts = 4) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastError = err;
      console.error(`Fetch failed (${i}/${attempts}):`, err);
      if (i < attempts) await sleep(1500 * i);
    }
  }
  throw lastError;
}

async function tg(method, payload) {
  const res = await fetchWithRetry(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
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
  const res = await fetchWithRetry(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
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
  const res = await fetchWithRetry(url);
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

async function stockStatusText() {
  try {
    const st = await fs.stat(STOCK_FILE);
    if (!st.isFile()) throw new Error("not file");
    const sizeMb = (st.size / 1024 / 1024).toFixed(1);
    const updated = formatDateInTZ(st.mtime, TZ);
    return [
      "Файл остатков загружен.",
      `Размер: ${sizeMb} МБ.`,
      `Дата файла на сервере: ${updated}.`,
      "",
      "Можно нажимать «2. Сделать Excel по артикулам».",
    ].join("\n");
  } catch {
    return [
      "Файл остатков ещё не загружен.",
      "",
      "Нажмите «1. Загрузить остатки 1С» и отправьте Excel-файл из 1С.",
    ].join("\n");
  }
}

async function makeImportFromText(chatId, text) {
  const requested = parseSkuList(text);
  if (requested.length < 1) return false;
  if (!(await stockExists())) {
    await sendMessage(
      chatId,
      [
        "Не вижу файла остатков 1С.",
        "",
        "Сначала нажмите «1. Загрузить остатки 1С» и отправьте Excel-файл.",
      ].join("\n"),
      { reply_markup: mainMenuKeyboard() }
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
    [
      `Готово: найдено ${result.matches.length} из ${requested.length}.`,
      `Не найдено: ${result.missing.length}.`,
      "Файл можно загрузить в импорт товаров на сайте.",
    ].join("\n")
  );
  if (result.missing.length > 0) {
    await sendMessage(
      chatId,
      [
        "Не найденные артикулы есть на втором листе Excel.",
        "",
        "Проверьте, есть ли они в остатках 1С, или пришлите другой список.",
      ].join("\n"),
      { reply_markup: mainMenuKeyboard() }
    );
  }
  return true;
}

async function handleCommand(chatId, text) {
  const today = formatDateInTZ(new Date(), TZ);
  const yesterday = getYesterdayDateString(TZ);

  if (text === "/start" || text === "/menu" || text === "Меню" || text === BTN_MENU) {
    await sendMessage(
      chatId,
      [
        "Выберите действие кнопкой ниже.",
        "",
        "Для Excel-импорта начните с кнопки «1. Загрузить остатки 1С».",
      ].join("\n"),
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  if (text === "/import" || text === BTN_HELP) {
    await sendMessage(chatId, importHelpText(), { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (text === BTN_UPLOAD_STOCK) {
    await sendMessage(
      chatId,
      [
        "<b>Шаг 1: загрузите остатки 1С</b>",
        "",
        "Отправьте сюда Excel-файл остатков из 1С.",
        "Файл должен быть в формате .xlsx или .xls.",
        "",
        "После загрузки бот напишет: «Остатки 1С сохранены».",
      ].join("\n"),
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  if (text === BTN_MAKE_IMPORT) {
    if (!(await stockExists())) {
      await sendMessage(chatId, await stockStatusText(), { reply_markup: mainMenuKeyboard() });
      return;
    }
    await sendMessage(
      chatId,
      [
        "<b>Шаг 2: пришлите список артикулов</b>",
        "",
        "Отправьте артикулы одним сообщением.",
        "Каждый артикул должен быть с новой строки.",
        "",
        "<b>Пример:</b>",
        "<code>13257840",
        "PPK10595",
        "13 171 805</code>",
        "",
        "Я пришлю готовый Excel для импорта на сайт.",
      ].join("\n"),
      { reply_markup: mainMenuKeyboard() }
    );
    return;
  }

  if (text === BTN_STOCK_STATUS) {
    await sendMessage(chatId, await stockStatusText(), { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (text === "📊 Статистика сегодня" || text === "Статистика сегодня") {
    await sendMessage(chatId, await getStatsTextForDate(today), { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (text === "📊 Статистика вчера") {
    await sendMessage(chatId, await getStatsTextForDate(yesterday), { reply_markup: mainMenuKeyboard() });
    return;
  }

  if (text === "🛒 Заказы сегодня" || text === "Заказы сегодня") {
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

  if (text === "🧾 Последние 5 заказов" || text === "Последние 5 заказов") {
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

  await sendMessage(
    chatId,
    [
      "Не понял сообщение.",
      "",
      "Выберите действие кнопкой ниже.",
      "Если нужно сделать Excel — нажмите «Как пользоваться».",
    ].join("\n"),
    { reply_markup: mainMenuKeyboard() }
  );
}

async function poll() {
  let offset = Number(process.env.TG_OFFSET || 0);
  for (;;) {
    let updates;
    try {
      updates = await tg("getUpdates", {
        offset,
        timeout: 50,
        allowed_updates: ["message"],
      });
    } catch (err) {
      console.error("Telegram polling error:", err);
      await sleep(5000);
      continue;
    }

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
            [
              "Остатки 1С сохранены.",
              `Размер файла: ${(saved.bytes / 1024 / 1024).toFixed(1)} МБ.`,
              "",
              "Теперь нажмите «2. Сделать Excel по артикулам».",
            ].join("\n"),
            { reply_markup: mainMenuKeyboard() }
          );
          continue;
        }

        if (!msg.text) continue;
        const text = msg.text.trim();
        await handleCommand(chatId, text);
      } catch (e) {
        try {
          await sendMessage(
            chatId,
            "Ошибка: " + escapeHtml(userErrorMessage(e)),
            { reply_markup: mainMenuKeyboard() }
          );
        } catch (sendErr) {
          console.error("Failed to send error message:", sendErr);
        }
      }
    }
  }
}

poll().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
