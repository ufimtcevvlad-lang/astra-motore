import { NextResponse } from "next/server";
import { createSession, registerUser, SESSION_COOKIE } from "../../../lib/auth";
import { appendConsentLog } from "../../../lib/consent-log";
import { checkRateLimit, getClientIp } from "../../../lib/rate-limit";
import { verifyTurnstileToken } from "../../../lib/turnstile";

type Body = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  consentPersonalData?: boolean;
  turnstileToken?: string;
};

export async function POST(request: Request) {
  const limit = checkRateLimit({
    request,
    key: "auth_register",
    windowMs: 60_000,
    max: 8,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток регистрации. Повторите позже." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  if (!body.consentPersonalData) {
    return NextResponse.json(
      { error: "Необходимо согласие на обработку персональных данных" },
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
      event: "auth_register",
      consentPersonalData: true,
      consentMarketing: Boolean((body as { consentMarketing?: boolean }).consentMarketing),
      ip,
      userAgent: request.headers.get("user-agent") || undefined,
      subject: {
        email: body.email,
        phone: body.phone,
        fullName: body.fullName,
      },
    });
  } catch {
    // ignore consent log errors
  }

  const result = await registerUser(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  const { token, expiresAt } = await createSession(result.user.id);
  const response = NextResponse.json({ ok: true, user: result.user });
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

