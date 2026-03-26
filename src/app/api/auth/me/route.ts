import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser, SESSION_COOKIE, updateUserProfile } from "../../../lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const user = await getSessionUser(token);
  return NextResponse.json({ user });
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const sessionUser = await getSessionUser(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Сессия не найдена" }, { status: 401 });
  }

  let body: { firstName?: string; lastName?: string; email?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const fullName = [lastName, firstName].filter(Boolean).join(" ").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();

  const result = await updateUserProfile(sessionUser.id, { fullName, email, phone });
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  return NextResponse.json({ user: result.user });
}

