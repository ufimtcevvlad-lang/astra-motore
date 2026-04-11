import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "Файл не загружен" },
      { status: 400 }
    );
  }

  if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
    return NextResponse.json(
      { error: "Допустимые форматы: .xlsx, .xls" },
      { status: 400 }
    );
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "Максимальный размер файла: 10MB" },
      { status: 400 }
    );
  }

  try {
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      header: "A",
    });

    // Column mapping: C=name, D=sku, E=brand, F=price
    const parsed: { name: string; sku: string; brand: string; price: number }[] = [];

    for (const row of rows) {
      const name = String(row["C"] ?? "").trim();
      const sku = String(row["D"] ?? "").trim();
      const brand = String(row["E"] ?? "").trim();
      const rawPrice = row["F"];

      if (!name || !sku) continue;

      const price = typeof rawPrice === "number"
        ? Math.round(rawPrice)
        : parseInt(String(rawPrice ?? "0").replace(/[^\d]/g, ""), 10) || 0;

      parsed.push({ name, sku, brand, price });
    }

    // Fetch existing products by SKU for duplicate detection
    const existingProducts = db
      .select()
      .from(schema.products)
      .all();

    const existingBySku = new Map(
      existingProducts.map((p) => [p.sku, p])
    );

    const newItems: typeof parsed = [];
    const duplicates: {
      parsed: (typeof parsed)[number];
      existing: { id: number; name: string; sku: string; brand: string; price: number };
    }[] = [];

    for (const item of parsed) {
      const existing = existingBySku.get(item.sku);
      if (existing) {
        duplicates.push({
          parsed: item,
          existing: {
            id: existing.id,
            name: existing.name,
            sku: existing.sku,
            brand: existing.brand,
            price: existing.price,
          },
        });
      } else {
        newItems.push(item);
      }
    }

    return NextResponse.json({
      newItems,
      duplicates,
      totalParsed: parsed.length,
    });
  } catch (e) {
    console.error("Excel import parse error:", e);
    return NextResponse.json(
      { error: "Ошибка чтения файла Excel" },
      { status: 500 }
    );
  }
}
