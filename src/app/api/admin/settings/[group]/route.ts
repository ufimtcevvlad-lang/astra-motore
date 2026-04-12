import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { inArray } from "drizzle-orm";

const SETTINGS_GROUPS: Record<string, string[]> = {
  contacts: [
    "contact_phone",
    "contact_email",
    "contact_address",
    "contact_telegram",
    "contact_whatsapp",
  ],
  company: [
    "company_name",
    "company_inn",
    "company_ogrn",
    "company_legal_address",
  ],
  notifications: [
    "notification_telegram_bot_token",
    "notification_telegram_chat_id",
    "notification_vapid_public",
    "notification_vapid_private",
  ],
  schedule: [
    "schedule_monday",
    "schedule_tuesday",
    "schedule_wednesday",
    "schedule_thursday",
    "schedule_friday",
    "schedule_saturday",
    "schedule_sunday",
  ],
  integrations: [
    "metrika_token",
    "metrika_counter_id",
    "ga_measurement_id",
  ],
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ group: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { group } = await params;
  const keys = SETTINGS_GROUPS[group];
  if (!keys) {
    return NextResponse.json({ error: "Unknown group" }, { status: 400 });
  }

  const rows = db
    .select()
    .from(schema.settings)
    .where(inArray(schema.settings.key, keys))
    .all();

  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  return NextResponse.json({ settings });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ group: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { group } = await params;
  const keys = SETTINGS_GROUPS[group];
  if (!keys) {
    return NextResponse.json({ error: "Unknown group" }, { status: 400 });
  }

  const body = await req.json();
  const now = new Date().toISOString();

  for (const key of keys) {
    if (key in body) {
      const value = String(body[key] ?? "");
      db.insert(schema.settings)
        .values({ key, value, updatedAt: now })
        .onConflictDoUpdate({
          target: schema.settings.key,
          set: { value, updatedAt: now },
        })
        .run();
    }
  }

  return NextResponse.json({ ok: true });
}
