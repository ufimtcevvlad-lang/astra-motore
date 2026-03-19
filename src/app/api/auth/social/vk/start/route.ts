import { NextResponse } from "next/server";

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://astramotors.shop";
}

export async function GET() {
  const clientId = process.env.VK_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "VK не настроен: добавьте VK_CLIENT_ID" },
      { status: 500 }
    );
  }

  const redirectUri = `${getSiteUrl()}/api/auth/social/vk/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "email",
    v: "5.199",
  });

  return NextResponse.redirect(`https://oauth.vk.com/authorize?${params.toString()}`);
}

