import { NextResponse } from "next/server";
import { createSession, registerUser, SESSION_COOKIE } from "../../../lib/auth";
import { appendConsentLog } from "../../../lib/consent-log";

type Body = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  consentPersonalData?: boolean;
};

export async function POST(request: Request) {
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

  try {
    await appendConsentLog({
      event: "auth_register",
      consentPersonalData: true,
      consentMarketing: Boolean((body as { consentMarketing?: boolean }).consentMarketing),
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        undefined,
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

