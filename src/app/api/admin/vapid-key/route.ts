import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  return NextResponse.json({
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null,
  });
}
