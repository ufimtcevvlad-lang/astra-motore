import { NextResponse } from "next/server";
import {
  isLoginBlocked,
  recordLoginAttempt,
  verifyAdminLogin,
  create2faCode,
} from "../../../../lib/admin-auth";
import { getClientIp } from "../../../../lib/rate-limit";
import { SITE_BRAND } from "../../../../lib/site";

type Body = {
  login: string;
  password: string;
};

function adminSmsEnvKey(login: string): string {
  return `ADMIN_2FA_SMS_${login.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}`;
}

function adminSmsPhone(admin: { id: number; login: string }): string | null {
  return (
    process.env[`ADMIN_2FA_SMS_ADMIN_${admin.id}`] ||
    process.env[adminSmsEnvKey(admin.login)] ||
    process.env.ADMIN_2FA_SMS_PHONE ||
    null
  );
}

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

async function sendAdminCodeViaSms(input: {
  phone: string;
  code: string;
  request: Request;
}): Promise<void> {
  const apiId = process.env.SMSRU_API_ID;
  if (!apiId) throw new Error("SMS.RU не настроен");

  const params = new URLSearchParams({
    api_id: apiId,
    to: input.phone,
    msg: `${SITE_BRAND}. Код админки: ${input.code}`,
    json: "1",
  });
  const sender = process.env.SMSRU_SENDER;
  if (sender) params.set("from", sender);

  const ip = getClientIp(input.request);
  if (ip) params.set("ip", ip);

  const res = await fetch(`https://sms.ru/sms/send?${params.toString()}`, {
    method: "GET",
  });
  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    status_code?: number;
    status_text?: string;
    message?: string;
    sms?: Record<string, { status_text?: string }>;
  };
  if (!res.ok || data.status !== "OK" || data.status_code !== 100) {
    const detail =
      data.sms?.[input.phone]?.status_text ||
      data.status_text ||
      data.message ||
      `SMS.RU HTTP ${res.status}`;
    throw new Error(detail);
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

  const deliveryErrors: string[] = [];
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken && admin.telegramChatId) {
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
      deliveryErrors.push(`Telegram: ${message}`);
    }
  } else {
    deliveryErrors.push("Telegram не настроен");
  }

  const smsPhone = adminSmsPhone(admin);
  if (smsPhone) {
    try {
      await sendAdminCodeViaSms({ phone: smsPhone, code, request });
      return NextResponse.json({ ok: true, adminId: admin.id, delivery: "sms" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "неизвестная ошибка";
      console.error("Admin 2FA SMS delivery failed:", message);
      deliveryErrors.push(`SMS: ${message}`);
    }
  } else {
    deliveryErrors.push("SMS fallback не настроен");
  }

  return NextResponse.json(
    {
      error: `Код создан, но не удалось отправить: ${deliveryErrors.join("; ")}`,
    },
    { status: 502 },
  );
}
