import { NextResponse } from "next/server";
import { db, schema } from "@/app/lib/db";
import { inArray } from "drizzle-orm";

const PUBLIC_KEYS = [
  "contact_phone",
  "contact_email",
  "contact_address",
  "contact_telegram",
  "contact_whatsapp",
  "company_name",
  "schedule_monday",
  "schedule_tuesday",
  "schedule_wednesday",
  "schedule_thursday",
  "schedule_friday",
  "schedule_saturday",
  "schedule_sunday",
];

export async function GET() {
  const rows = db
    .select()
    .from(schema.settings)
    .where(inArray(schema.settings.key, PUBLIC_KEYS))
    .all();

  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  return NextResponse.json({ settings });
}
