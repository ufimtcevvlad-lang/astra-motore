import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { gt, sql } from "drizzle-orm";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const [result] = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.conversations)
    .where(gt(schema.conversations.unreadCount, 0))
    .all();

  return NextResponse.json({ unreadCount: Number(result.count) });
}
