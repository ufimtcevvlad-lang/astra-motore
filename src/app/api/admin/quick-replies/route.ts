import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { asc } from "drizzle-orm";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const replies = db
    .select()
    .from(schema.quickReplies)
    .orderBy(asc(schema.quickReplies.sortOrder))
    .all();

  return NextResponse.json({ replies });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const { title, text } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!text?.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  // Find max sortOrder
  const existing = db
    .select({ sortOrder: schema.quickReplies.sortOrder })
    .from(schema.quickReplies)
    .orderBy(asc(schema.quickReplies.sortOrder))
    .all();

  const maxSort = existing.length > 0 ? Math.max(...existing.map((r) => r.sortOrder)) : -1;

  db.insert(schema.quickReplies)
    .values({
      title: title.trim(),
      text: text.trim(),
      sortOrder: maxSort + 1,
    })
    .run();

  return NextResponse.json({ success: true }, { status: 201 });
}
