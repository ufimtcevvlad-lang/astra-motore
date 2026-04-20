import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/app/lib/db";
import { and, ne } from "drizzle-orm";

const PARSER_TOKEN = process.env.PARSER_API_TOKEN || "";

export async function GET(req: NextRequest) {
  const token =
    req.headers.get("x-api-token") ||
    req.nextUrl.searchParams.get("token") ||
    "";
  if (!PARSER_TOKEN || token !== PARSER_TOKEN) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const rows = await db
    .select({
      sku: schema.products.sku,
      brand: schema.products.brand,
      price: schema.products.price,
    })
    .from(schema.products)
    .where(and(ne(schema.products.sku, ""), ne(schema.products.brand, "")));

  const body =
    rows.map((r) => `${r.sku}|${r.brand}|${r.price}`).join("\n") + "\n";
  return new NextResponse(body, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
