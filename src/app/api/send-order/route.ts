import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { SITE_BRAND } from "../../lib/site";
import { appendConsentLog } from "../../lib/consent-log";
import { checkRateLimit, getClientIp } from "../../lib/rate-limit";
import { verifyTurnstileToken } from "../../lib/turnstile";

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
  turnstileToken?: string;
  deliveryMethod?: "pickup" | "courier";
  deliveryCity?: string;
  deliveryQuote?: {
    tariffCode?: number;
    tariffName?: string;
    deliverySum?: number;
    periodMin?: number | null;
    periodMax?: number | null;
  } | null;
  cdekPickupPoint?: {
    code?: string;
    name?: string;
    city?: string;
    address?: string;
    workTime?: string;
  } | null;
  paymentMethod?: "sbp" | "card" | "cash";
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
  const limit = checkRateLimit({
    request,
    key: "send_order",
    windowMs: 10 * 60_000,
    max: 20,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много заявок. Повторите позже." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

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

  const {
    name,
    phone,
    comment,
    items,
    total,
    consentPersonalData,
    consentMarketing,
    deliveryMethod,
    deliveryCity,
    deliveryQuote,
    cdekPickupPoint,
    paymentMethod,
  } = body;
  const ip = getClientIp(request);
  const humanOk = await verifyTurnstileToken(body.turnstileToken, ip);
  if (!humanOk) {
    return NextResponse.json({ error: "Проверка безопасности не пройдена" }, { status: 400 });
  }

  // Лимиты длин — защита от мусорных/DoS-запросов
  const NAME_MAX = 120;
  const PHONE_MAX = 32;
  const COMMENT_MAX = 2000;
  const CITY_MAX = 120;
  const ITEM_NAME_MAX = 300;
  const ITEMS_MAX = 200;

  if (
    !name?.trim() ||
    !phone?.trim() ||
    !Array.isArray(items) ||
    typeof total !== "number" ||
    !consentPersonalData
  ) {
    return NextResponse.json(
      { error: "Не заполнены имя, телефон, корзина или согласие на обработку персональных данных" },
      { status: 400 }
    );
  }

  if (name.trim().length > NAME_MAX || phone.trim().length > PHONE_MAX) {
    return NextResponse.json({ error: "Имя или телефон слишком длинные" }, { status: 400 });
  }

  // Телефон: минимум 10 цифр (российские номера ≥ 10)
  const phoneDigits = phone.replace(/\D/g, "");
  if (phoneDigits.length < 10 || phoneDigits.length > 15) {
    return NextResponse.json({ error: "Некорректный номер телефона" }, { status: 400 });
  }

  if (comment && comment.length > COMMENT_MAX) {
    return NextResponse.json({ error: "Комментарий слишком длинный" }, { status: 400 });
  }

  if (deliveryCity && deliveryCity.length > CITY_MAX) {
    return NextResponse.json({ error: "Название города слишком длинное" }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "Корзина пуста" }, { status: 400 });
  }

  if (items.length > ITEMS_MAX) {
    return NextResponse.json({ error: "Слишком много позиций в корзине" }, { status: 400 });
  }

  // Проверяем каждую позицию корзины
  for (const item of items) {
    if (
      !item ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      item.name.length > ITEM_NAME_MAX ||
      typeof item.quantity !== "number" ||
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0 ||
      item.quantity > 10_000 ||
      typeof item.price !== "number" ||
      !Number.isFinite(item.price) ||
      item.price < 0 ||
      typeof item.sum !== "number" ||
      !Number.isFinite(item.sum) ||
      item.sum < 0
    ) {
      return NextResponse.json({ error: "Некорректные данные позиции корзины" }, { status: 400 });
    }
  }

  // Проверяем итоговую сумму
  if (!Number.isFinite(total) || total < 0 || total > 100_000_000) {
    return NextResponse.json({ error: "Некорректная сумма заказа" }, { status: 400 });
  }

  // Сумма по позициям должна совпадать с total (с поправкой на копейки)
  const itemsTotal = items.reduce((acc, it) => acc + it.sum, 0);
  if (Math.abs(itemsTotal - total) > 1) {
    return NextResponse.json({ error: "Сумма заказа не совпадает с позициями" }, { status: 400 });
  }

  try {
    await appendConsentLog({
      event: "order_submit",
      consentPersonalData: true,
      consentMarketing: Boolean(consentMarketing),
      ip,
      userAgent: request.headers.get("user-agent") || undefined,
      subject: {
        fullName: name,
        phone,
      },
    });
  } catch {
    // ignore consent log errors
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
      deliveryMethod,
      deliveryCity: deliveryCity?.trim() || "",
      deliveryQuote: deliveryQuote ?? null,
      cdekPickupPoint: cdekPickupPoint ?? null,
      paymentMethod,
      userAgent: request.headers.get("user-agent") || undefined,
      ip,
    });
  } catch {
    // Не блокируем оформление заказа, даже если не удалось записать лог
  }

  const lines: string[] = [
    `🛒 <b>Новый заказ — ${SITE_BRAND}</b>`,
    "",
    "👤 <b>Имя:</b> " + escapeTelegram(name.trim()),
    "📞 <b>Телефон:</b> " + escapeTelegram(phone.trim()),
  ];

  if (comment?.trim()) {
    lines.push("💬 <b>Комментарий:</b> " + escapeTelegram(comment.trim()));
  }

  if (deliveryMethod === "pickup") {
    lines.push("🚚 <b>Получение:</b> Самовывоз");
  } else if (deliveryMethod === "courier") {
    const city = deliveryCity?.trim() ? `, ${escapeTelegram(deliveryCity.trim())}` : "";
    const sum =
      typeof deliveryQuote?.deliverySum === "number"
        ? `, ${deliveryQuote.deliverySum.toLocaleString("ru-RU")} ₽`
        : "";
    const tariff = deliveryQuote?.tariffName ? ` (${escapeTelegram(deliveryQuote.tariffName)})` : "";
    lines.push(`🚚 <b>Доставка:</b> СДЭК${city}${sum}${tariff}`);
    if (cdekPickupPoint?.address || cdekPickupPoint?.name) {
      const pointLine = [cdekPickupPoint.name, cdekPickupPoint.address].filter(Boolean).join(", ");
      lines.push("📍 <b>ПВЗ:</b> " + escapeTelegram(pointLine));
    }
  }

  if (paymentMethod) {
    const paymentLabel =
      paymentMethod === "sbp" ? "СБП" : paymentMethod === "card" ? "Карта" : "При получении";
    lines.push("💳 <b>Оплата:</b> " + paymentLabel);
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
