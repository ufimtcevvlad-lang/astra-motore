import { NextResponse } from "next/server";
import {
  createSession,
  findUserByLogin,
  SESSION_COOKIE,
  verifyPassword,
} from "../../../lib/auth";
import { appendConsentLog } from "../../../lib/consent-log";
import { checkRateLimit, getClientIp } from "../../../lib/rate-limit";
import { verifyTurnstileToken } from "../../../lib/turnstile";

type Body = {
  login: string;
  password: string;
  rememberMe?: boolean;
  consentPersonalData?: boolean;
  turnstileToken?: string;
};

export async function POST(request: Request) {
  const limit = checkRateLimit({
    request,
    key: "auth_login",
    windowMs: 60_000,
    max: 12,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток входа. Повторите позже." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const login = String(body.login || "").trim();
  const password = String(body.password || "");
  if (!login || !password || !body.consentPersonalData) {
    return NextResponse.json(
      { error: "Введите адрес электронной почты или телефон, пароль и подтвердите согласие на обработку персональных данных" },
      { status: 400 }
    );
  }
  const ip = getClientIp(request);
  const humanOk = await verifyTurnstileToken(body.turnstileToken, ip);
  if (!humanOk) {
    return NextResponse.json({ error: "Проверка безопасности не пройдена" }, { status: 400 });
  }

  try {
    await appendConsentLog({
      event: "auth_login_password",
      consentPersonalData: true,
      ip,
      userAgent: request.headers.get("user-agent") || undefined,
      subject: {
        login,
      },
    });
  } catch {
    // ignore consent log errors
  }

  const user = await findUserByLogin(login);
  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return NextResponse.json({ error: "Неверные данные для входа" }, { status: 401 });
  }

  const rememberMe = Boolean(body.rememberMe);
  const { token, expiresAt } = await createSession(user.id, {
    ttlDays: rememberMe ? 30 : 1,
  });
  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
    },
  });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return response;
}

