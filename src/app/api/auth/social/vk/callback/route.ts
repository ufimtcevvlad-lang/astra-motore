import { NextResponse } from "next/server";
import { createSession, findUserByProvider, SOCIAL_PENDING_COOKIE } from "../../../../../lib/auth";

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://astramotors.shop";
}

type VkTokenResponse = {
  access_token?: string;
  user_id?: number;
  email?: string;
  error?: string;
  error_description?: string;
};

type VkUserResponse = {
  response?: Array<{
    first_name?: string;
    last_name?: string;
  }>;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${getSiteUrl()}/auth/login?error=vk_no_code`);
  }

  const clientId = process.env.VK_CLIENT_ID;
  const clientSecret = process.env.VK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${getSiteUrl()}/auth/login?error=vk_not_configured`);
  }

  const redirectUri = `${getSiteUrl()}/api/auth/social/vk/callback`;
  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const tokenRes = await fetch(`https://oauth.vk.com/access_token?${tokenParams.toString()}`);
  const tokenData = (await tokenRes.json().catch(() => ({}))) as VkTokenResponse;
  if (!tokenRes.ok || tokenData.error || !tokenData.user_id) {
    return NextResponse.redirect(`${getSiteUrl()}/auth/login?error=vk_token_failed`);
  }

  const providerUserId = String(tokenData.user_id);
  const existing = await findUserByProvider("vk", providerUserId);
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

  const userInfoParams = new URLSearchParams({
    user_ids: providerUserId,
    access_token: tokenData.access_token || "",
    v: "5.199",
  });
  const userInfoRes = await fetch(`https://api.vk.com/method/users.get?${userInfoParams.toString()}`);
  const userInfo = (await userInfoRes.json().catch(() => ({}))) as VkUserResponse;
  const vkUser = userInfo.response?.[0];
  const fullName =
    [vkUser?.first_name, vkUser?.last_name].filter(Boolean).join(" ").trim() || "Пользователь VK";

  const pending = {
    provider: "vk",
    providerUserId,
    fullName,
    email: tokenData.email || "",
    tgUsername: "",
  };
  const response = NextResponse.redirect(`${getSiteUrl()}/auth/complete-profile?provider=vk`);
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

