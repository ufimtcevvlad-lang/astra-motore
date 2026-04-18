import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const convId = Number(id);
  if (!Number.isFinite(convId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const note = (body?.note ?? "").toString().slice(0, 2000);

  const now = new Date().toISOString();

  const result = db
    .update(schema.conversations)
    .set({ adminNote: note, updatedAt: now })
    .where(eq(schema.conversations.id, convId))
    .run();

  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, adminNote: note });
}
