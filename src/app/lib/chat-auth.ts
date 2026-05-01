import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

const COOKIE_NAME = "chat_token";
const TTL_DAYS = 30;

export function generateToken(): string {
  return crypto.randomUUID() + "-" + crypto.randomUUID();
}

export async function createChatToken(conversationId: number): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const createdAt = new Date().toISOString();

  await db.insert(schema.chatTokens).values({
    conversationId,
    token,
    expiresAt,
    createdAt,
  });

  return token;
}

export async function verifyChatToken(
  token: string
): Promise<{ conversationId: number } | null> {
  const now = new Date().toISOString();

  const rows = await db
    .select()
    .from(schema.chatTokens)
    .where(eq(schema.chatTokens.token, token))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  if (row.expiresAt < now) return null;

  return { conversationId: row.conversationId };
}

export async function getChatTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function setChatTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: TTL_DAYS * 24 * 60 * 60,
    path: "/",
  });
}
