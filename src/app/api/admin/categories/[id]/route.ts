import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, sql } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const rows = await db.select().from(schema.categories).where(eq(schema.categories.id, Number(id)));
  if (rows.length === 0) {
    return NextResponse.json({ error: "Категория не найдена" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json();
  const { title, slug, groupName, groupSlug, sortOrder } = body;

  if (!title || !slug || !groupName || !groupSlug) {
    return NextResponse.json({ error: "Заполните все обязательные поля" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.slug, slug));
  if (existing.length > 0 && existing[0].id !== Number(id)) {
    return NextResponse.json({ error: "Категория с таким slug уже существует" }, { status: 400 });
  }

  await db
    .update(schema.categories)
    .set({ title, slug, groupName, groupSlug, sortOrder: sortOrder ?? 0 })
    .where(eq(schema.categories.id, Number(id)));

  const updated = await db.select().from(schema.categories).where(eq(schema.categories.id, Number(id)));
  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  const productCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.products)
    .where(eq(schema.products.categoryId, Number(id)));

  if (Number(productCount[0].count) > 0) {
    return NextResponse.json(
      { error: `Нельзя удалить категорию: к ней привязано ${productCount[0].count} товаров` },
      { status: 400 }
    );
  }

  await db.delete(schema.categories).where(eq(schema.categories.id, Number(id)));
  return NextResponse.json({ success: true });
}
