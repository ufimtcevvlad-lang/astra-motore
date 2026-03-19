import { NextResponse } from "next/server";
import { createSmsCodeForPhone } from "../../../../lib/auth";

type Body = {
  phone: string;
};

async function sendCodeViaTelegram(phone: string, code: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("SMS не настроен: задайте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID");
  }

  const text = [
    "🔐 <b>Код входа (SMS)</b>",
    "",
    `📞 <b>Телефон:</b> ${phone}`,
    `🔢 <b>Код:</b> ${code}`,
    "",
    "Этот код предназначен для входа в личный кабинет.",
  ].join("\n");

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
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data?.description || "Ошибка отправки кода");
  }
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const result = await createSmsCodeForPhone(String(body.phone || ""));
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  try {
    await sendCodeViaTelegram(result.phone, result.code);
    return NextResponse.json({ ok: true, message: "Код отправлен" });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        ok: true,
        message: "Код создан (dev fallback)",
        devCode: result.code,
      });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Не удалось отправить код" },
      { status: 500 }
    );
  }
}

