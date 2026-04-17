import { NextRequest, NextResponse } from "next/server";

const PARSER_URL = process.env.PARSER_API_URL || "";
const PARSER_TOKEN = process.env.PARSER_API_TOKEN || "";

export async function POST(req: NextRequest) {
  if (!PARSER_URL) return NextResponse.json({ results: [] });
  const body = await req.json();
  const resp = await fetch(`${PARSER_URL}/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Token": PARSER_TOKEN,
    },
    body: JSON.stringify(body),
    next: { revalidate: 0 },
  });
  if (!resp.ok) return NextResponse.json({ results: [] });
  return NextResponse.json(await resp.json());
}
