import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const formData = await req.formData();
  const title = formData.get("title") as string;
  const text = (formData.get("text") as string) || "";
  const link = (formData.get("link") as string) || "";
  const isActive = formData.get("isActive") === "true";
  const file = formData.get("image") as File | null;

  if (!title) {
    return NextResponse.json({ error: "Заголовок обязателен" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { title, text, link, isActive };

  if (file && file.size > 0) {
    const uploadDir = path.join(process.cwd(), "public/uploads/banners");
    await mkdir(uploadDir, { recursive: true });
    const bytes = await file.arrayBuffer();
    const ext = file.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));
    updates.image = `/uploads/banners/${filename}`;
  }

  await db
    .update(schema.banners)
    .set(updates)
    .where(eq(schema.banners.id, Number(id)));

  const updated = await db
    .select()
    .from(schema.banners)
    .where(eq(schema.banners.id, Number(id)));

  return NextResponse.json({ banner: updated[0] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  await db.delete(schema.banners).where(eq(schema.banners.id, Number(id)));

  return NextResponse.json({ ok: true });
}
