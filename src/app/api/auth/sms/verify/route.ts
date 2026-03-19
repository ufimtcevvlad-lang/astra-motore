import { NextResponse } from "next/server";
import {
  createSession,
  SESSION_COOKIE,
  verifySmsCodeForPhone,
} from "../../../../lib/auth";

type Body = {
  phone: string;
  code: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const result = await verifySmsCodeForPhone(String(body.phone || ""), String(body.code || ""));
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  const { token, expiresAt } = await createSession(result.userId);
  const response = NextResponse.json({ ok: true });
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

