import { NextResponse } from "next/server";
import {
  createSession,
  findUserByLogin,
  SESSION_COOKIE,
  verifyPassword,
} from "../../../lib/auth";

type Body = {
  login: string;
  password: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const login = String(body.login || "").trim();
  const password = String(body.password || "");
  if (!login || !password) {
    return NextResponse.json({ error: "Введите email/телефон и пароль" }, { status: 400 });
  }

  const user = await findUserByLogin(login);
  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    return NextResponse.json({ error: "Неверные данные для входа" }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(user.id);
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

