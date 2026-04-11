import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../lib/admin-middleware";

export async function GET() {
  const result = await requireAdmin();
  if (!result.authorized) {
    return result.response;
  }
  const { admin } = result;
  return NextResponse.json({
    id: admin.id,
    login: admin.login,
    name: admin.name,
    telegramChatId: admin.telegramChatId,
  });
}
