import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, and, isNull } from "drizzle-orm";

export async function PUT(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const convId = Number(id);

  const [conversation] = db
    .select({ id: schema.conversations.id })
    .from(schema.conversations)
    .where(eq(schema.conversations.id, convId))
    .all();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const now = new Date().toISOString();

  // Set readAt on all unread customer messages
  db.update(schema.messages)
    .set({ readAt: now })
    .where(
      and(
        eq(schema.messages.conversationId, convId),
        eq(schema.messages.sender, "customer"),
        isNull(schema.messages.readAt)
      )
    )
    .run();

  // Reset unreadCount to 0
  db.update(schema.conversations)
    .set({
      unreadCount: 0,
      updatedAt: now,
    })
    .where(eq(schema.conversations.id, convId))
    .run();

  return NextResponse.json({ success: true });
}
