import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { phone } = await params;
  const decodedPhone = decodeURIComponent(phone);
  const body = await req.json();

  const now = new Date().toISOString();

  const values: Record<string, unknown> = {
    customerPhone: decodedPhone,
    createdAt: now,
    updatedAt: now,
  };

  if (body.status !== undefined) values.status = body.status;
  if (body.carModels !== undefined) values.carModels = body.carModels;
  if (body.notes !== undefined) values.notes = body.notes;
  if (auth.admin) values.adminId = auth.admin.id;

  const updateValues: Record<string, unknown> = { updatedAt: now };
  if (body.status !== undefined) updateValues.status = body.status;
  if (body.carModels !== undefined) updateValues.carModels = body.carModels;
  if (body.notes !== undefined) updateValues.notes = body.notes;
  if (auth.admin) updateValues.adminId = auth.admin.id;

  db.insert(schema.customerNotes)
    .values(values as typeof schema.customerNotes.$inferInsert)
    .onConflictDoUpdate({
      target: schema.customerNotes.customerPhone,
      set: updateValues,
    })
    .run();

  return NextResponse.json({ ok: true });
}
