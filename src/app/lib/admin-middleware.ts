import { NextResponse } from "next/server";
import { getSessionAdmin, ADMIN_SESSION_COOKIE } from "./admin-auth";

export async function requireAdmin() {
  const admin = await getSessionAdmin();
  if (!admin) {
    return {
      authorized: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { authorized: true as const, admin };
}

// Re-export cookie name for convenience in routes
export { ADMIN_SESSION_COOKIE };
