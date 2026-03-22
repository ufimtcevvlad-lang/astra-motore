import { NextResponse } from "next/server";
import { searchCatalogProducts } from "../../../lib/catalog-search";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const limitRaw = searchParams.get("limit");
  const limit = Math.min(24, Math.max(1, parseInt(limitRaw ?? "8", 10) || 8));

  const results = searchCatalogProducts(q, limit);
  return NextResponse.json({ query: q.trim(), results });
}
