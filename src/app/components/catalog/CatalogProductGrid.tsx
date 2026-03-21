import type { Product } from "../../data/products";
import { CatalogProductCard } from "./CatalogProductCard";

export function CatalogProductGrid({
  items,
  emptyMessage = "Нет позиций для отображения.",
}: {
  items: Product[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-600">{emptyMessage}</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <CatalogProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}
