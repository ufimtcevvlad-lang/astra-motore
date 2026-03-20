import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ bot: string }> }
) {
  const url = new URL(request.url);
  const { bot } = await params;
  const origin = url.origin;

  // Прокси страницы embed Telegram:
  // наш фронт/виджет иногда запрашивает iframe src как `/embed/<bot>...`
  // Поэтому отдаём то же содержимое с telegram.org, но с нашего домена.
  const target = `https://telegram.org/embed/${encodeURIComponent(bot)}${
    url.search ? url.search : ""
  }`;

  const res = await fetch(target);
  let body = await res.text();

  // Мы отдаем HTML с telegram.org, но браузер может не иметь доступа к telegram.org ресурсам.
  // Поэтому переписываем URL так, чтобы все обращения шли через наш сервер:
  // 1) https://telegram.org/* => https://<наш_домен>/tproxy/*
  // 2) /file/*, /tile/*, /Auth/* => /tproxy/file/*, /tproxy/tile/*, /tproxy/Auth/*
  const tproxyPrefix = `${origin}/tproxy/`;
  body = body
    .replace(/https:\/\/telegram\.org\//g, tproxyPrefix)
    .replace(/\/\/telegram\.org\//g, tproxyPrefix);

  body = body
    .replace(/(["'`])\/file\//g, `$1${origin}/tproxy/file/`)
    .replace(/(["'`])\/tile\//g, `$1${origin}/tproxy/tile/`)
    .replace(/(["'`])\/Auth\//g, `$1${origin}/tproxy/Auth/`)
    .replace(/(["'`])\/auth\//gi, `$1${origin}/tproxy/auth/`)
    .replace(/(["'`])\/js\//g, `$1${origin}/tproxy/js/`)
    .replace(/(["'`])\/css\//g, `$1${origin}/tproxy/css/`)
    .replace(/(["'`])\/img\//g, `$1${origin}/tproxy/img/`);

  // Некоторые версии виджета используют относительные ссылки без префикса quotes.
  body = body
    .replace(/\/file\//g, `/tproxy/file/`)
    .replace(/\/tile\//g, `/tproxy/tile/`)
    .replace(/\/Auth\//g, `/tproxy/Auth/`);

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

