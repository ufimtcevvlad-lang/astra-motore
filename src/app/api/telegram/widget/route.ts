import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 часа

const CACHE_FILE = path.join(process.cwd(), "data", "cache", "telegram-widget.proxy.v2.js");

export async function GET() {
  try {
    const stat = await fs.stat(CACHE_FILE);
    const age = Date.now() - stat.mtimeMs;
    if (age < CACHE_TTL_MS) {
      const cached = await fs.readFile(CACHE_FILE, "utf8");
      return new NextResponse(cached, {
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    }
  } catch {
    // ignore cache miss
  }

  // Фетчим виджет со стороны сервера и кешируем, чтобы браузер не зависел от доступности telegram.org.
  // Также переписываем относительный URL iframe (/embed/...) в абсолютный telegram.org/embed/...
  // Иначе при прокси скрипта iframe пытается грузиться с нашего домена: /embed/<bot> (что даёт 404).
  const res = await fetch("https://telegram.org/js/telegram-widget.js?22");
  let code = await res.text();

  // Нормализуем встраивание виджета на случай прокси скрипта.
  code = code.replace(/(["'`])\/embed\//g, `$1https://telegram.org/embed/`);

  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, code, "utf8");

  return new NextResponse(code, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}

