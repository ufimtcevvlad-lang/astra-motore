import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

// Для отладки Telegram виджета кэш лучше отключить,
// чтобы прокси всегда возвращал актуальный и переписанный JS.
const CACHE_TTL_MS = 0; // 0 = не использовать кэш

const CACHE_FILE = path.join(process.cwd(), "data", "cache", "telegram-widget.proxy.v3.js");

export async function GET() {
  // Кэш отключен (CACHE_TTL_MS=0), всегда переписываем свежий JS.

  // Фетчим виджет со стороны сервера и кешируем, чтобы браузер не зависел от доступности telegram.org.
  // Также переписываем относительный URL iframe (/embed/...) в абсолютный telegram.org/embed/...
  // Иначе при прокси скрипта iframe пытается грузиться с нашего домена: /embed/<bot> (что даёт 404).
  const res = await fetch("https://telegram.org/js/telegram-widget.js?22");
  let code = await res.text();

  // Нормализуем встраивание виджета:
  // Telegram виджет строит iframe src как "/embed/<bot>...".
  // Без замены будет 404 на нашем домене: /embed/<bot>.
  code = code.replace(/(["'`])\/embed\//g, "$1https://telegram.org/embed/");
  // На всякий случай (если встретится без завершающего слэша)
  code = code.replace(/(["'`])\/embed(?=\w)/g, "$1https://telegram.org/embed");

  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, code, "utf8");

  return new NextResponse(code, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

