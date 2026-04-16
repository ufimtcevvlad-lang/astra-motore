export interface MarketOffer {
  site: string;
  price: number;
  delivery_days: number | null;
  in_stock: number | null;
  seller_name: string | null;
  scraped_at: string;
}

export interface MarketSummary {
  article: string;
  brand: string;
  min_price: number;
  max_price: number;
  median_price: number;
  sites_count: number;
  offers_count: number;
  offers: MarketOffer[];
}

export type PriceZone = "red" | "green" | "yellow" | "no_data";

export function getPriceZone(yourPrice: number, summary: MarketSummary | null): PriceZone {
  if (!summary || summary.offers.length === 0) return "no_data";
  if (yourPrice > summary.max_price) return "red";
  if (yourPrice < summary.min_price) return "yellow";
  return "green";
}

export function formatPrice(price: number): string {
  return `${Math.round(price).toLocaleString("ru-RU")} ₽`;
}

export async function fetchMarketData(article: string, brand: string): Promise<MarketSummary | null> {
  try {
    const params = new URLSearchParams({ article, brand });
    const resp = await fetch(`/api/price-monitor?${params}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.offers || data.offers.length === 0) return null;
    return data as MarketSummary;
  } catch {
    return null;
  }
}

export async function triggerParse(article: string, brand: string): Promise<MarketSummary | null> {
  try {
    const params = new URLSearchParams({ article, brand });
    const resp = await fetch(`/api/price-monitor/parse?${params}`, { method: "POST" });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}
