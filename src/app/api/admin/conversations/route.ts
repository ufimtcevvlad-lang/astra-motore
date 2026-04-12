import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, like, and, gt, desc, sql, or, isNull } from "drizzle-orm";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const filter = url.searchParams.get("filter") || "all";
  const search = url.searchParams.get("search")?.trim() || null;
  const assignedTo = url.searchParams.get("assignedTo") || null;

  const conditions = [];

  if (filter === "unread") {
    conditions.push(gt(schema.conversations.unreadCount, 0));
  }

  if (search) {
    conditions.push(
      or(
        like(schema.conversations.customerName, `%${search}%`),
        like(schema.conversations.customerContact, `%${search}%`)
      )
    );
  }

  if (assignedTo) {
    if (assignedTo === "unassigned") {
      conditions.push(isNull(schema.conversations.assignedAdminId));
    } else {
      conditions.push(eq(schema.conversations.assignedAdminId, Number(assignedTo)));
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Count for pagination
  const [countResult] = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.conversations)
    .where(where)
    .all();

  const total = Number(countResult.count);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const offset = (page - 1) * PAGE_SIZE;

  // Main conversations query
  const conversations = db
    .select()
    .from(schema.conversations)
    .where(where)
    .orderBy(desc(schema.conversations.lastMessageAt))
    .limit(PAGE_SIZE)
    .offset(offset)
    .all();

  // For each conversation, get last non-internal message as preview
  const conversationsWithPreview = conversations.map((conv) => {
    const lastMessage = db
      .select({
        id: schema.messages.id,
        sender: schema.messages.sender,
        text: schema.messages.text,
        createdAt: schema.messages.createdAt,
      })
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.conversationId, conv.id),
          eq(schema.messages.isInternalNote, false)
        )
      )
      .orderBy(desc(schema.messages.createdAt))
      .limit(1)
      .all()[0] ?? null;

    const preview = lastMessage
      ? lastMessage.text.length > 100
        ? lastMessage.text.slice(0, 100) + "…"
        : lastMessage.text
      : "";

    return { ...conv, preview, lastMessagePreview: lastMessage };
  });

  // Total unread conversations
  const [unreadResult] = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.conversations)
    .where(gt(schema.conversations.unreadCount, 0))
    .all();

  const totalUnread = Number(unreadResult.count);

  return NextResponse.json({
    conversations: conversationsWithPreview,
    total,
    page,
    totalPages,
    totalUnread,
  });
}
