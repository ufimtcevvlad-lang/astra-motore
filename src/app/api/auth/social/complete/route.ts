import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSession,
  registerUserWithProvider,
  SESSION_COOKIE,
  SOCIAL_PENDING_COOKIE,
} from "../../../../lib/auth";

type Body = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
};

type Pending = {
  provider: "vk" | "telegram";
  providerUserId: string;
  fullName?: string;
  email?: string;
  tgUsername?: string;
};

function decodePending(raw: string | undefined): Pending | null {
  if (!raw) return null;
  try {
    const decoded = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Pending;
    if (!decoded?.provider || !decoded?.providerUserId) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const pending = decodePending(cookieStore.get(SOCIAL_PENDING_COOKIE)?.value);
  if (!pending) {
    return NextResponse.json({ error: "Социальная сессия истекла. Начните вход заново." }, { status: 400 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const result = await registerUserWithProvider({
    fullName: String(body.fullName || ""),
    email: String(body.email || ""),
    phone: String(body.phone || ""),
    password: String(body.password || ""),
    provider: pending.provider,
    providerUserId: pending.providerUserId,
    tgUsername: pending.tgUsername,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  const { token, expiresAt } = await createSession(result.user.id);
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
  response.cookies.set({
    name: SOCIAL_PENDING_COOKIE,
    value: "",
    path: "/",
    expires: new Date(0),
  });
  return response;
}

