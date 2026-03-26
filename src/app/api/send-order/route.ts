import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

type OrderItem = {
  name: string;
  quantity: number;
  price: number;
  sum: number;
};

type Body = {
  name: string;
  phone: string;
  comment: string;
  items: OrderItem[];
  total: number;
  consentPersonalData: boolean;
  consentMarketing?: boolean;
};

type PersistedOrder = Body & {
  createdAt: string;
  userAgent?: string;
  ip?: string;
};

function escapeTelegram(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function persistOrder(order: PersistedOrder) {
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "orders.ndjson");
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(file, JSON.stringify(order) + "\n", "utf8");
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json(
      { error: "Telegram не настроен: добавьте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env.local" },
      { status: 500 }
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const { name, phone, comment, items, total, consentPersonalData, consentMarketing } = body;
  if (
    !name?.trim() ||
    !phone?.trim() ||
    !Array.isArray(items) ||
    typeof total !== "number" ||
    !consentPersonalData
  ) {
    return NextResponse.json(
      { error: "Не заполнены имя, телефон, корзина или согласие ПДн" },
      { status: 400 }
    );
  }

  // Сохраняем заказ в append-only лог на сервере (для меню бота: «Заказы»)
  try {
    await persistOrder({
      createdAt: new Date().toISOString(),
      name: name.trim(),
      phone: phone.trim(),
      comment: comment?.trim() || "",
      items,
      total,
      consentPersonalData: Boolean(consentPersonalData),
      consentMarketing: Boolean(consentMarketing),
      userAgent: request.headers.get("user-agent") || undefined,
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        undefined,
    });
  } catch {
    // Не блокируем оформление заказа, даже если не удалось записать лог
  }

  const lines: string[] = [
    "🛒 <b>Новый заказ — Astra Motors</b>",
    "",
    "👤 <b>Имя:</b> " + escapeTelegram(name.trim()),
    "📞 <b>Телефон:</b> " + escapeTelegram(phone.trim()),
  ];

  if (comment?.trim()) {
    lines.push("💬 <b>Комментарий:</b> " + escapeTelegram(comment.trim()));
  }

  lines.push("", "📦 <b>Товары:</b>");
  for (const item of items) {
    lines.push(
      `• ${escapeTelegram(item.name)} — ${item.quantity} шт. × ${item.price.toLocaleString("ru-RU")} ₽ = ${item.sum.toLocaleString("ru-RU")} ₽`
    );
  }
  lines.push("", "💰 <b>Итого: " + total.toLocaleString("ru-RU") + " ₽</b>");

  const text = lines.join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
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
