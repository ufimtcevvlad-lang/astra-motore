import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const replyId = Number(id);

  const [existing] = db
    .select({ id: schema.quickReplies.id })
    .from(schema.quickReplies)
    .where(eq(schema.quickReplies.id, replyId))
    .all();

  if (!existing) {
    return NextResponse.json({ error: "Quick reply not found" }, { status: 404 });
  }

  const body = await req.json();
  const updates: Partial<{ title: string; text: string; sortOrder: number }> = {};

  if (body.title !== undefined) updates.title = String(body.title).trim();
  if (body.text !== undefined) updates.text = String(body.text).trim();
  if (body.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  db.update(schema.quickReplies)
    .set(updates)
    .where(eq(schema.quickReplies.id, replyId))
    .run();

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const replyId = Number(id);

  const [existing] = db
    .select({ id: schema.quickReplies.id })
    .from(schema.quickReplies)
    .where(eq(schema.quickReplies.id, replyId))
    .all();

  if (!existing) {
    return NextResponse.json({ error: "Quick reply not found" }, { status: 404 });
  }

  db.delete(schema.quickReplies)
    .where(eq(schema.quickReplies.id, replyId))
    .run();

  return NextResponse.json({ success: true });
}
