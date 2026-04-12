import { NextResponse } from "next/server";
import { db, schema } from "@/app/lib/db";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const banners = await db
    .select()
    .from(schema.banners)
    .where(eq(schema.banners.isActive, true))
    .orderBy(asc(schema.banners.sortOrder));

  return NextResponse.json({ banners });
}
