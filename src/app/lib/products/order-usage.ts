import { db, schema } from "@/app/lib/db";
import { inArray } from "drizzle-orm";

export type ProductNameLookup = Map<number, string>;

export async function loadProductNames(ids: number[]): Promise<ProductNameLookup> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: schema.products.id, name: schema.products.name })
    .from(schema.products)
    .where(inArray(schema.products.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}

export async function countOrdersReferencing(names: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, 0);
  if (names.length === 0) return counts;

  const orders = await db.select({ items: schema.orders.items }).from(schema.orders);
  const nameSet = new Set(names);

  for (const o of orders) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(o.items);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    const seenInThisOrder = new Set<string>();
    for (const it of parsed) {
      const n = typeof it === "object" && it !== null ? (it as { name?: unknown }).name : null;
      if (typeof n === "string" && nameSet.has(n) && !seenInThisOrder.has(n)) {
        seenInThisOrder.add(n);
        counts.set(n, (counts.get(n) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export async function getOrderUsageByProductIds(
  ids: number[]
): Promise<{ id: number; name: string; ordersCount: number }[]> {
  const names = await loadProductNames(ids);
  if (names.size === 0) return [];
  const counts = await countOrdersReferencing([...names.values()]);
  return [...names.entries()]
    .map(([id, name]) => ({ id, name, ordersCount: counts.get(name) ?? 0 }))
    .filter((e) => e.ordersCount > 0);
}
