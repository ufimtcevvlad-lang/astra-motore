import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { and, eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { admin } = auth;

  let body: { endpoint: string; keys: { p256dh: string; auth: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys) {
    return NextResponse.json({ error: "Missing endpoint or keys" }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Upsert: delete old subscription for same admin+endpoint, then insert fresh
  await db
    .delete(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.adminId, admin.id),
        eq(schema.pushSubscriptions.endpoint, endpoint)
      )
    );

  await db.insert(schema.pushSubscriptions).values({
    adminId: admin.id,
    endpoint,
    keysJson: JSON.stringify(keys),
    createdAt: now,
  });

  return NextResponse.json({ ok: true });
}
