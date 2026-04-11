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

  // Send code via Telegram
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken && admin.telegramChatId) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: admin.telegramChatId,
          text: `*Код подтверждения входа в админку:*\n\`${code}\`\n\nКод действует 5 минут.`,
          parse_mode: "Markdown",
        }),
      });
    } catch {
      // Telegram delivery failure should not block the flow — code is still created
    }
  }

  return NextResponse.json({ ok: true, adminId: admin.id });
}
