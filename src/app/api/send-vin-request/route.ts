import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

type Body = {
  name: string;
  phone: string;
  vin: string;
  car: string;
  request: string;
  comment?: string;
};

function escapeTelegram(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function persistVinRequest(entry: Body & { createdAt: string; ip?: string }) {
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "vin-requests.ndjson");
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(file, JSON.stringify(entry) + "\n", "utf8");
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json(
      {
        error:
          "Telegram не настроен: добавьте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env.local",
      },
      { status: 500 }
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const { name, phone, vin, car, request: requestText, comment } = body;

  const vinNorm = String(vin || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (!name?.trim() || !phone?.trim() || !vinNorm || vinNorm.length !== 17 || !car?.trim() || !requestText?.trim()) {
    return NextResponse.json(
      { error: "Не заполнены имя, телефон, VIN (17 знаков), авто или запрос" },
      { status: 400 }
    );
  }

  const payload: Body = {
    ...body,
    name: name.trim(),
    phone: phone.trim(),
    vin: vinNorm,
    car: car.trim(),
    request: requestText.trim(),
    comment: comment?.trim() || undefined,
  };

  // Не блокируем отправку в Telegram, даже если не удалось сохранить лог.
  try {
    await persistVinRequest({
      ...payload,
      createdAt: new Date().toISOString(),
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        undefined,
    });
  } catch {
    // ignore
  }

  const lines: string[] = [
    "🧾 <b>Новый VIN-запрос — Astra Motors</b>",
    "",
    "👤 <b>Имя:</b> " + escapeTelegram(payload.name),
    "📞 <b>Телефон:</b> " + escapeTelegram(payload.phone),
    "🆔 <b>VIN:</b> " + escapeTelegram(payload.vin),
    "🚗 <b>Авто:</b> " + escapeTelegram(payload.car),
    "",
    "🧩 <b>Что нужно:</b> " + escapeTelegram(payload.request),
  ];

  if (payload.comment) {
    lines.push("", "💬 <b>Комментарий:</b> " + escapeTelegram(payload.comment));
  }

  const text = lines.join("\n");

  try {
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

    const data = await res.json();
    if (!data.ok) {
      return NextResponse.json(
        { error: data.description || "Ошибка Telegram" },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка отправки в Telegram" },
      { status: 502 }
    );
  }
}

