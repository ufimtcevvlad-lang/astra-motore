import { createHash, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { createSession, findUserByProvider, SOCIAL_PENDING_COOKIE } from "../../../../../lib/auth";

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://astramotors.shop";
}

function verifyTelegramAuth(params: URLSearchParams, botToken: string): boolean {
  const hash = params.get("hash");
  if (!hash) return false;

  const entries = Array.from(params.entries())
    .filter(([k]) => k !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`);

  const dataCheckString = entries.join("\n");
  const secretKey = createHash("sha256").update(botToken).digest();
  const hmac = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  return hmac === hash;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.redirect(`${getSiteUrl()}/auth/login?error=tg_not_configured`);
  }

  if (!verifyTelegramAuth(url.searchParams, botToken)) {
    return NextResponse.redirect(`${getSiteUrl()}/auth/login?error=tg_verify_failed`);
  }

  const tgId = url.searchParams.get("id");
  if (!tgId) {
    return NextResponse.redirect(`${getSiteUrl()}/auth/login?error=tg_no_id`);
  }

  const existing = await findUserByProvider("telegram", tgId);
  if (existing) {
    const { token, expiresAt } = await createSession(existing.id);
    const response = NextResponse.redirect(`${getSiteUrl()}/account`);
    response.cookies.set({
      name: "am_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
    return response;
  }

  const firstName = url.searchParams.get("first_name") || "";
  const lastName = url.searchParams.get("last_name") || "";
  const username = url.searchParams.get("username") || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || "Пользователь Telegram";

  const pending = {
    provider: "telegram",
    providerUserId: tgId,
    fullName,
    email: "",
    tgUsername: username,
  };
  const response = NextResponse.redirect(`${getSiteUrl()}/auth/complete-profile?provider=telegram`);
  response.cookies.set({
    name: SOCIAL_PENDING_COOKIE,
    value: Buffer.from(JSON.stringify(pending), "utf8").toString("base64url"),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}

