import { NextResponse } from "next/server";
import { getAllProducts } from "../../../../lib/products-db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const excludeIds = new Set(
    (searchParams.get("excludeIds") || "").split(",").filter(Boolean),
  );
  const preferCategories = new Set(
    (searchParams.get("preferCategories") || "").split(",").filter(Boolean),
  );
  const limit = Math.max(1, Math.min(24, Number(searchParams.get("limit") || 6)));

  const items = getAllProducts()
    .filter((p) => !excludeIds.has(p.id))
    .sort((a, b) => {
      const aScore = preferCategories.has(a.category) ? 0 : 1;
      const bScore = preferCategories.has(b.category) ? 0 : 1;
      if (aScore !== bScore) return aScore - bScore;
      return a.price - b.price;
    })
    .slice(0, limit);

  return NextResponse.json({ items });
}
