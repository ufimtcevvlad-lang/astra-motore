import { NextRequest, NextResponse } from "next/server";

const PARSER_URL = process.env.PARSER_API_URL || "";
const PARSER_TOKEN = process.env.PARSER_API_TOKEN || "";

export async function GET() {
  if (!PARSER_URL) return NextResponse.json([]);
  const resp = await fetch(`${PARSER_URL}/aliases`, {
    headers: { "X-API-Token": PARSER_TOKEN },
    cache: "no-store",
  });
  if (!resp.ok) return NextResponse.json([]);
  return NextResponse.json(await resp.json());
}

export async function POST(req: NextRequest) {
  if (!PARSER_URL) return NextResponse.json({ ok: false }, { status: 503 });
  const body = await req.json();
  const resp = await fetch(`${PARSER_URL}/aliases`, {
    method: "POST",
    headers: {
      "X-API-Token": PARSER_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return NextResponse.json(await resp.json(), { status: resp.status });
}
