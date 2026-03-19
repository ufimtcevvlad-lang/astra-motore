import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SOCIAL_PENDING_COOKIE } from "../../../../lib/auth";

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

export async function GET() {
  const cookieStore = await cookies();
  const pending = decodePending(cookieStore.get(SOCIAL_PENDING_COOKIE)?.value);
  return NextResponse.json({ pending });
}

