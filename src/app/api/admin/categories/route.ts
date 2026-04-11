import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, sql, asc } from "drizzle-orm";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const rows = await db
    .select({
      id: schema.categories.id,
      slug: schema.categories.slug,
      title: schema.categories.title,
      groupSlug: schema.categories.groupSlug,
      groupName: schema.categories.groupName,
      sortOrder: schema.categories.sortOrder,
      createdAt: schema.categories.createdAt,
      productCount: sql<number>`(SELECT COUNT(*) FROM products WHERE category_id = ${schema.categories.id})`,
    })
    .from(schema.categories)
    .orderBy(asc(schema.categories.groupName), asc(schema.categories.sortOrder));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const { title, slug, groupName, groupSlug, sortOrder } = body;

  if (!title || !slug || !groupName || !groupSlug) {
    return NextResponse.json({ error: "Заполните все обязательные поля" }, { status: 400 });
  }

  const existing = await db.select().from(schema.categories).where(eq(schema.categories.slug, slug));
  if (existing.length > 0) {
    return NextResponse.json({ error: "Категория с таким slug уже существует" }, { status: 400 });
  }

  const result = await db.insert(schema.categories).values({
    title,
    slug,
    groupName,
    groupSlug,
    sortOrder: sortOrder ?? 0,
    createdAt: new Date().toISOString(),
  }).returning();

  return NextResponse.json(result[0], { status: 201 });
}
