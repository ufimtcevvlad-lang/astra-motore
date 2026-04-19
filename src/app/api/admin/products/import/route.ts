import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import * as XLSX from "xlsx";
import { classify, type RejectReason } from "@/app/lib/import/classify";
import { rewriteName } from "@/app/lib/import/rewrite-name";
import { detectCategory } from "@/app/lib/import/detect-category";

export interface ParsedRow {
  sku: string;
  name: string;          // финальное (переписанное)
  rawName: string;       // как было в Excel
  brand: string;
  price: number;
  car: string;
  sectionSlug: string | null;
}

export interface DuplicateRow extends ParsedRow {
  existing: { id: number; name: string; price: number; brand: string };
}

export interface RejectedRow {
  sku: string;
  rawName: string;
  brand: string;
  price: number;
  reason: RejectReason;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Файл не загружен" }, { status: 400 });
  if (!/\.xlsx?$/i.test(file.name))
    return NextResponse.json({ error: "Допустимые форматы: .xlsx, .xls" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "Максимальный размер файла: 10MB" }, { status: 400 });

  try {
    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { header: "A" });

    const newItems: ParsedRow[] = [];
    const duplicates: DuplicateRow[] = [];
    const rejected: RejectedRow[] = [];

    // Колонки C=name, D=sku, E=brand, F=price.
    for (const row of rows) {
      const rawName = String(row["C"] ?? "").trim();
      const sku = String(row["D"] ?? "").trim();
      const brand = String(row["E"] ?? "").trim();
      const rawPrice = row["F"];
      if (!rawName || !sku) continue;
      const price =
        typeof rawPrice === "number"
          ? Math.round(rawPrice)
          : parseInt(String(rawPrice ?? "0").replace(/[^\d]/g, ""), 10) || 0;

      const reject = classify(rawName, brand);
      if (reject) {
        rejected.push({ sku, rawName, brand, price, reason: reject });
        continue;
      }

      const rw = rewriteName(rawName, sku);
      const sectionSlug = detectCategory(rawName);
      const parsed: ParsedRow = {
        sku,
        name: rw.name,
        rawName,
        brand,
        price,
        car: rw.car,
        sectionSlug,
      };

      const existing = db.select().from(schema.products).all().find((p) => p.sku === sku);
      if (existing) {
        duplicates.push({
          ...parsed,
          existing: { id: existing.id, name: existing.name, price: existing.price, brand: existing.brand },
        });
      } else {
        newItems.push(parsed);
      }
    }

    return NextResponse.json({
      newItems,
      duplicates,
      rejected,
      totalParsed: newItems.length + duplicates.length + rejected.length,
    });
  } catch (e) {
    console.error("Excel import parse error:", e);
    return NextResponse.json({ error: "Ошибка чтения файла Excel" }, { status: 500 });
  }
}
