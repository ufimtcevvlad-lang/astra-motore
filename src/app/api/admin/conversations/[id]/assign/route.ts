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
  const convId = Number(id);

  const [conversation] = db
    .select({ id: schema.conversations.id })
    .from(schema.conversations)
    .where(eq(schema.conversations.id, convId))
    .all();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const body = await req.json();
  // adminId can be a number or null
  const adminId = body.adminId !== undefined ? body.adminId : null;

  db.update(schema.conversations)
    .set({
      assignedAdminId: adminId,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.conversations.id, convId))
    .run();

  return NextResponse.json({ success: true });
}
