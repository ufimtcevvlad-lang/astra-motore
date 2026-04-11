import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const { items } = body as { items: { id: number; sortOrder: number }[] };

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  for (const item of items) {
    await db
      .update(schema.categories)
      .set({ sortOrder: item.sortOrder })
      .where(eq(schema.categories.id, item.id));
  }

  return NextResponse.json({ success: true });
}
