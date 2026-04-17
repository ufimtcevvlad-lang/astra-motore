import { NextRequest, NextResponse } from "next/server";

const PARSER_URL = process.env.PARSER_API_URL || "";
const PARSER_TOKEN = process.env.PARSER_API_TOKEN || "";

export async function GET(req: NextRequest) {
  if (!PARSER_URL) {
    return NextResponse.json({ article: "", brand: "", scraped_at: null, sites: [] });
  }
  const article = req.nextUrl.searchParams.get("article") || "";
  const brand = req.nextUrl.searchParams.get("brand") || "";
  const resp = await fetch(
    `${PARSER_URL}/site-results?article=${encodeURIComponent(article)}&brand=${encodeURIComponent(brand)}`,
    { headers: { "X-API-Token": PARSER_TOKEN }, cache: "no-store" }
  );
  if (!resp.ok) {
    return NextResponse.json({ article, brand, scraped_at: null, sites: [] });
  }
  return NextResponse.json(await resp.json());
}
