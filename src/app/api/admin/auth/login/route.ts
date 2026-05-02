import { NextResponse } from "next/server";
import {
  isLoginBlocked,
  recordLoginAttempt,
  verifyAdminLogin,
  create2faCode,
} from "../../../../lib/admin-auth";
import { getClientIp } from "../../../../lib/rate-limit";

type Body = {
  login: string;
  password: string;
};

async function sendAdminCodeViaTelegram(input: {
  botToken: string;
  chatId: string;
  code: string;
}): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${input.botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: input.chatId,
      text: `*Код подтверждения входа в админку:*\n\`${input.code}\`\n\nКод действует 5 минут.`,
      parse_mode: "Markdown",
    }),
  });

  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!res.ok || data.ok === false) {
    throw new Error(data.description || `Telegram HTTP ${res.status}`);
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (isLoginBlocked(ip)) {
    return NextResponse.json(
      { error: "Слишком много неудачных попыток. Повторите через 15 минут." },
      { status: 429 }
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const login = String(body.login ?? "").trim();
  const password = String(body.password ?? "");

  if (!login || !password) {
    return NextResponse.json({ error: "Введите логин и пароль" }, { status: 400 });
  }

  const admin = await verifyAdminLogin(login, password);
  if (!admin) {
    recordLoginAttempt(ip, false);
    return NextResponse.json({ error: "Неверные данные для входа" }, { status: 401 });
  }

  recordLoginAttempt(ip, true);

  const code = await create2faCode(admin.id);
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken || !admin.telegramChatId) {
    return NextResponse.json(
      { error: "Telegram не настроен для отправки кода входа" },
      { status: 500 },
    );
  }

  try {
    await sendAdminCodeViaTelegram({
      botToken,
      chatId: admin.telegramChatId,
      code,
    });
    return NextResponse.json({ ok: true, adminId: admin.id, delivery: "telegram" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "неизвестная ошибка";
    console.error("Admin 2FA Telegram delivery failed:", message);
    return NextResponse.json(
      { error: `Код создан, но Telegram не смог его отправить: ${message}` },
      { status: 502 },
    );
  }
}
