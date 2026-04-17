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

export interface NotificationItem {
  article: string;
  brand: string;
  your_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
  deviation_pct: number;
  sites_count: number;
}

export interface Notifications {
  generated_at: string | null;
  total_parsed: number;
  red_count: number;
  yellow_count: number;
  green_count: number;
  red_items: NotificationItem[];
  yellow_items: NotificationItem[];
}

export async function fetchNotifications(): Promise<Notifications | null> {
  try {
    const resp = await fetch("/api/price-monitor/notifications");
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

export type SiteStatus = "OFFERS" | "OUT_OF_STOCK" | "NOT_FOUND" | "ERROR" | "NOT_CONFIGURED";
export type ErrorCategory = "timeout" | "http_error" | "auth_failed" | "parse_error" | "unknown";

export interface SiteOffer {
  article: string;
  brand: string;
  site: string;
  price: number;
  delivery_days: number | null;
  in_stock: boolean | null;
  seller_name: string | null;
}

export interface SiteResult {
  site: string;
  status: SiteStatus;
  offers: SiteOffer[];
  found_brands: string[] | null;
  error_category: ErrorCategory | null;
  error_text: string | null;
  duration_ms: number;
}

export interface SiteResultsResponse {
  article: string;
  brand: string;
  scraped_at: string | null;
  sites: SiteResult[];
}

export async function fetchSiteResults(article: string, brand: string): Promise<SiteResultsResponse | null> {
  try {
    const params = new URLSearchParams({ article, brand });
    const r = await fetch(`/api/price-monitor/site-results?${params}`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function refreshSiteResults(article: string, brand: string): Promise<SiteResultsResponse | null> {
  try {
    const params = new URLSearchParams({ article, brand });
    const r = await fetch(`/api/price-monitor/parse-v3?${params}`, { method: "POST" });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function addBrandAlias(canonical: string, alias: string, site: string | null): Promise<boolean> {
  try {
    const r = await fetch("/api/price-monitor/aliases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canonical, alias, site }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
