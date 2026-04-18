import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, like, and, gte, lte, or, desc } from "drizzle-orm";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const url = req.nextUrl;
  const search = url.searchParams.get("search")?.trim() || null;
  const categoryId = url.searchParams.get("categoryId");
  const brand = url.searchParams.get("brand");
  const inStock = url.searchParams.get("inStock");
  const priceFrom = url.searchParams.get("priceFrom");
  const priceTo = url.searchParams.get("priceTo");

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        like(schema.products.name, `%${search}%`),
        like(schema.products.sku, `%${search}%`)
      )
    );
  }
  if (categoryId) conditions.push(eq(schema.products.categoryId, Number(categoryId)));
  if (brand) conditions.push(eq(schema.products.brand, brand));
  if (inStock === "yes") conditions.push(gte(schema.products.inStock, 1));
  else if (inStock === "no") conditions.push(eq(schema.products.inStock, 0));
  if (priceFrom) conditions.push(gte(schema.products.price, Number(priceFrom)));
  if (priceTo) conditions.push(lte(schema.products.price, Number(priceTo)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select({
      sku: schema.products.sku,
      name: schema.products.name,
      brand: schema.products.brand,
      price: schema.products.price,
      inStock: schema.products.inStock,
      categoryTitle: schema.categories.title,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(where)
    .orderBy(desc(schema.products.updatedAt));

  // Columns match Excel import: A, B empty (1C reserved), C=name, D=sku, E=brand, F=price
  // Extras for admin convenience: G=stock, H=category (ignored on reimport)
  const header = ["", "", "Наименование", "Артикул", "Бренд", "Цена", "Остаток", "Категория"];
  const rows = [
    header,
    ...items.map((i) => [
      "",
      "",
      i.name,
      i.sku,
      i.brand ?? "",
      i.price,
      i.inStock,
      i.categoryTitle ?? "",
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 4 },
    { wch: 4 },
    { wch: 56 },
    { wch: 18 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Товары");

  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const filename = `products-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
