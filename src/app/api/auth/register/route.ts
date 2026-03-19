import { NextResponse } from "next/server";
import { createSession, registerUser, SESSION_COOKIE } from "../../../lib/auth";

type Body = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
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

