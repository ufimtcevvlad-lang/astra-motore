import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const { ids } = body as { ids: number[] };

  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  for (let i = 0; i < ids.length; i++) {
    await db
      .update(schema.banners)
      .set({ sortOrder: i })
      .where(eq(schema.banners.id, ids[i]));
  }

  return NextResponse.json({ ok: true });
}
