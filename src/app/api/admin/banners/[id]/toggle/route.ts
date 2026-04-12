import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, sql } from "drizzle-orm";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  await db
    .update(schema.banners)
    .set({ isActive: sql`NOT is_active` })
    .where(eq(schema.banners.id, Number(id)));

  const updated = await db
    .select()
    .from(schema.banners)
    .where(eq(schema.banners.id, Number(id)));

  return NextResponse.json({ banner: updated[0] });
}
