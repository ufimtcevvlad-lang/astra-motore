import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { asc, sql } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const banners = await db
    .select()
    .from(schema.banners)
    .orderBy(asc(schema.banners.sortOrder));

  return NextResponse.json({ banners });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const formData = await req.formData();
  const title = formData.get("title") as string;
  const text = (formData.get("text") as string) || "";
  const link = (formData.get("link") as string) || "";
  const isActive = formData.get("isActive") === "true";
  const file = formData.get("image") as File | null;

  if (!title) {
    return NextResponse.json({ error: "Заголовок обязателен" }, { status: 400 });
  }

  let image = "";
  if (file && file.size > 0) {
    const uploadDir = path.join(process.cwd(), "public/uploads/banners");
    await mkdir(uploadDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));
    image = `/uploads/banners/${filename}`;
  }

  // Get max sortOrder
  const maxResult = await db
    .select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
    .from(schema.banners);
  const nextOrder = (maxResult[0]?.max ?? -1) + 1;

  const result = await db
    .insert(schema.banners)
    .values({
      title,
      text,
      link,
      image,
      isActive,
      sortOrder: nextOrder,
      createdAt: new Date().toISOString(),
    })
    .returning();

  return NextResponse.json({ banner: result[0] }, { status: 201 });
}
