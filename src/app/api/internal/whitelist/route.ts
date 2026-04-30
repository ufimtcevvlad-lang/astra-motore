import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

type WhitelistProduct = {
  sku: string;
  image: string;
};

function readProducts(dbPath: string): WhitelistProduct[] {
  if (!fs.existsSync(dbPath)) return [];
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    return db
      .prepare(
        `SELECT sku, image
         FROM products
         WHERE sku IS NOT NULL AND sku != ''
         ORDER BY sku COLLATE NOCASE`
      )
      .all()
      .map((row) => {
        const r = row as { sku: string; image: string | null };
        return { sku: r.sku, image: r.image ?? "" };
      });
  } finally {
    db.close();
  }
}

export async function GET() {
  const dataDir = path.join(process.cwd(), "data");

  return NextResponse.json({
    gm: readProducts(path.join(dataDir, "shop.db")),
    nonGm: readProducts(path.join(dataDir, "shop-non-gm.db")),
    generatedAt: new Date().toISOString(),
  });
}
