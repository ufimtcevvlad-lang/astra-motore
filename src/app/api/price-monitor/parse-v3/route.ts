import { NextRequest, NextResponse } from "next/server";

const PARSER_URL = process.env.PARSER_API_URL || "";
const PARSER_TOKEN = process.env.PARSER_API_TOKEN || "";

export async function POST(req: NextRequest) {
  if (!PARSER_URL) {
    return NextResponse.json({ article: "", brand: "", scraped_at: null, sites: [] });
  }
  const article = req.nextUrl.searchParams.get("article") || "";
  const brand = req.nextUrl.searchParams.get("brand") || "";
  const resp = await fetch(
    `${PARSER_URL}/parse-v3?article=${encodeURIComponent(article)}&brand=${encodeURIComponent(brand)}`,
    { method: "POST", headers: { "X-API-Token": PARSER_TOKEN } }
  );
  if (!resp.ok) {
    return NextResponse.json({ article, brand, scraped_at: null, sites: [] });
  }
  return NextResponse.json(await resp.json());
}
