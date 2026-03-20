import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bot: string }> }
) {
  const url = new URL(request.url);
  const { bot } = await params;

  // Прокси страницы embed Telegram:
  // наш фронт/виджет иногда запрашивает iframe src как `/embed/<bot>...`
  // Поэтому отдаём то же содержимое с telegram.org, но с нашего домена.
  const target = `https://telegram.org/embed/${encodeURIComponent(bot)}${
    url.search ? url.search : ""
  }`;

  const res = await fetch(target);
  const body = await res.text();

  const contentType =
    res.headers.get("content-type") || "text/html; charset=utf-8";

  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": contentType,
      // Не кэшируем: embed может зависеть от токенов/параметров
      "Cache-Control": "no-store",
    },
  });
}

