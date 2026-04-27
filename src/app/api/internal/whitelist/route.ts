/**
 * Публичный эндпоинт для парсера фото: список всех артикулов с обоих
 * SQLite-БД (shop.db = GM, shop-non-gm.db = non-GM) + поле `image`,
 * чтобы sku_guard мог понять у какого SKU уже есть реальные фото на
 * сайте (не «_pending») и не перетирать.
 *
 * Зачем нужен HTTP-эндпоинт: парсер запускается под launchd, и оттуда
 * SSH/scp таймаутят на banner-exchange (видимо разная сетевая
 * маршрутизация vs Terminal). А HTTPS до gmshop66.ru работает —
 * этот же канал, что и обычные посетители используют.
 *
 * Безопасность: данные не чувствительные — SKU и сейчас публичны через
 * /catalog. Auth не требуется. Ставим короткий cache-control, чтобы
 * парсер всегда видел свежий каталог через ~30 секунд после импорта.
 */
import { NextResponse } from "next/server";
import { db, schema } from "@/app/lib/db";
import { nonGmDb } from "@/app/lib/db/non-gm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface WhitelistRow {
  sku: string;
  image: string | null;
}

function readSkus(database: typeof db): WhitelistRow[] {
  const rows = database
    .select({ sku: schema.products.sku, image: schema.products.image })
    .from(schema.products)
    .all();
  return rows
    .filter((r): r is { sku: string; image: string | null } => Boolean(r.sku))
    .map((r) => ({ sku: r.sku, image: r.image ?? null }));
}

export async function GET() {
  try {
    const gm = readSkus(db);
    const nonGm = readSkus(nonGmDb);
    return NextResponse.json(
      { gm, nonGm, generatedAt: new Date().toISOString() },
      {
        headers: {
          "cache-control": "no-store, max-age=0",
          "x-source": "internal-whitelist",
        },
      },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
