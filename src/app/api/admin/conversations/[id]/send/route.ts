import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const convId = Number(id);

  // Check conversation exists
  const [conversation] = db
    .select({ id: schema.conversations.id })
    .from(schema.conversations)
    .where(eq(schema.conversations.id, convId))
    .all();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const body = await req.json();
  const { text, isInternalNote = false } = body;

  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Insert message
  db.insert(schema.messages)
    .values({
      conversationId: convId,
      sender: "admin",
      adminId: auth.admin.id,
      text: text.trim(),
      attachments: "[]",
      isInternalNote: Boolean(isInternalNote),
      createdAt: now,
    })
    .run();

  // Update conversation timestamps
  db.update(schema.conversations)
    .set({
      lastMessageAt: now,
      updatedAt: now,
      status: "active",
    })
    .where(eq(schema.conversations.id, convId))
    .run();

  return NextResponse.json({ success: true });
}
