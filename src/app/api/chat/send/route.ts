import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/app/lib/db";
import { eq, sql } from "drizzle-orm";
import { getChatTokenFromCookie, verifyChatToken } from "@/app/lib/chat-auth";
import { notifyAdminsNewMessage } from "@/app/lib/notifications";

export async function POST(req: NextRequest) {
  const token = await getChatTokenFromCookie();
  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const verified = await verifyChatToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { conversationId } = verified;

  let body: { text?: string; attachments?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { text, attachments } = body;

  const hasText = text && typeof text === "string" && text.trim() !== "";
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

  if (!hasText && !hasAttachments) {
    return NextResponse.json(
      { error: "Необходимо указать текст или вложения" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const messageResult = await db
    .insert(schema.messages)
    .values({
      conversationId,
      sender: "customer",
      text: hasText ? text!.trim() : "",
      attachments: JSON.stringify(hasAttachments ? attachments : []),
      isInternalNote: false,
      createdAt: now,
    })
    .returning({ id: schema.messages.id });

  const messageId = messageResult[0].id;

  await db
    .update(schema.conversations)
    .set({
      lastMessageAt: now,
      updatedAt: now,
      unreadCount: sql`${schema.conversations.unreadCount} + 1`,
      status: "new",
    })
    .where(eq(schema.conversations.id, conversationId));

  // Fire-and-forget admin notifications
  notifyAdminsNewMessage(conversationId, hasText ? text!.trim() : "[вложение]").catch(() => {});

  return NextResponse.json({ messageId });
}
