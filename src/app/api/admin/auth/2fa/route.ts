import { NextResponse } from "next/server";
import { verify2faCode, createAdminSession, ADMIN_SESSION_COOKIE } from "../../../../lib/admin-auth";
import { getClientIp } from "../../../../lib/rate-limit";

type Body = {
  adminId: number;
  code: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const adminId = Number(body.adminId);
  const code = String(body.code ?? "").trim();

  if (!adminId || !code) {
    return NextResponse.json({ error: "Передайте adminId и code" }, { status: 400 });
  }

  const result = await verify2faCode(adminId, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 401 });
  }

  const ip = getClientIp(request);
  const { token, expiresAt } = await createAdminSession(adminId, ip);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return response;
}
