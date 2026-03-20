import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    result?: { username?: string };
  };

  const username = data?.result?.username;
  if (!username) {
    return NextResponse.json({ error: "Cannot get bot username" }, { status: 500 });
  }

  return NextResponse.json({ username });
}

