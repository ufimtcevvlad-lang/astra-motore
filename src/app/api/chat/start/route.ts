import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/app/lib/db";
import {
  getChatTokenFromCookie,
  verifyChatToken,
  createChatToken,
  setChatTokenCookie,
} from "@/app/lib/chat-auth";

export async function POST(req: NextRequest) {
  // Check existing cookie first
  const existingToken = await getChatTokenFromCookie();
  if (existingToken) {
    const verified = await verifyChatToken(existingToken);
    if (verified) {
      return NextResponse.json({ conversationId: verified.conversationId, resumed: true });
    }
  }

  // Parse body
  let body: { name?: string; contact?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body?.name?.trim() || "";
  const contact = body?.contact?.trim() || "";

  const now = new Date().toISOString();

  const result = await db
    .insert(schema.conversations)
    .values({
      channel: "chat",
      customerName: name,
      customerContact: contact,
      status: "new",
      lastMessageAt: now,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: schema.conversations.id });

  const conversationId = result[0].id;

  const token = await createChatToken(conversationId);
  await setChatTokenCookie(token);

  return NextResponse.json({ conversationId, resumed: false });
}
