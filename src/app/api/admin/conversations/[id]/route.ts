import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const convId = Number(id);

  // Get conversation
  const [conversation] = db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, convId))
    .all();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // Get all messages, parse attachments
  const messagesRaw = db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, convId))
    .all();

  const messages = messagesRaw.map((msg) => {
    let attachments = [];
    try {
      attachments = JSON.parse(msg.attachments);
    } catch { /* empty */ }
    return { ...msg, attachments };
  });

  // Get assigned admin if any
  let assignedAdmin = null;
  if (conversation.assignedAdminId) {
    const [admin] = db
      .select({
        id: schema.admins.id,
        name: schema.admins.name,
        login: schema.admins.login,
      })
      .from(schema.admins)
      .where(eq(schema.admins.id, conversation.assignedAdminId))
      .all();
    assignedAdmin = admin ?? null;
  }

  // Get all admins for assign dropdown
  const allAdmins = db
    .select({
      id: schema.admins.id,
      name: schema.admins.name,
      login: schema.admins.login,
    })
    .from(schema.admins)
    .all();

  return NextResponse.json({ conversation, messages, assignedAdmin, allAdmins });
}
