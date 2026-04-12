import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/app/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { getChatTokenFromCookie, verifyChatToken } from "@/app/lib/chat-auth";

export async function GET(req: NextRequest) {
  const token = await getChatTokenFromCookie();
  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const verified = await verifyChatToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { conversationId } = verified;

  const afterParam = req.nextUrl.searchParams.get("after");
  const afterId = afterParam ? parseInt(afterParam, 10) : null;

  const conditions = [
    eq(schema.messages.conversationId, conversationId),
    eq(schema.messages.isInternalNote, false),
  ];

  if (afterId !== null && !isNaN(afterId)) {
    conditions.push(gt(schema.messages.id, afterId));
  }

  const rows = await db
    .select()
    .from(schema.messages)
    .where(and(...conditions))
    .orderBy(schema.messages.id);

  const messages = rows.map((m) => ({
    ...m,
    attachments: (() => {
      try {
        return JSON.parse(m.attachments);
      } catch {
        return [];
      }
    })(),
  }));

  return NextResponse.json({ messages });
}
