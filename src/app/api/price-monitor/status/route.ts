import { NextResponse } from "next/server";

const PARSER_URL = process.env.PARSER_API_URL || "";
const PARSER_TOKEN = process.env.PARSER_API_TOKEN || "";

export async function GET() {
  if (!PARSER_URL) return NextResponse.json({ sources: [] });
  const resp = await fetch(`${PARSER_URL}/status`, {
    headers: { "X-API-Token": PARSER_TOKEN },
    next: { revalidate: 0 },
  });
  if (!resp.ok) return NextResponse.json({ sources: [] });
  return NextResponse.json(await resp.json());
}
