import { NextResponse } from "next/server";

const PARSER_URL = process.env.PARSER_API_URL || "";
const PARSER_TOKEN = process.env.PARSER_API_TOKEN || "";

const EMPTY = {
  generated_at: null,
  total_parsed: 0,
  red_count: 0,
  yellow_count: 0,
  green_count: 0,
  red_items: [],
  yellow_items: [],
};

export async function GET() {
  if (!PARSER_URL) return NextResponse.json(EMPTY);
  try {
    const resp = await fetch(`${PARSER_URL}/notifications`, {
      headers: { "X-API-Token": PARSER_TOKEN },
      next: { revalidate: 0 },
    });
    if (!resp.ok) return NextResponse.json(EMPTY);
    return NextResponse.json(await resp.json());
  } catch {
    return NextResponse.json(EMPTY);
  }
}
