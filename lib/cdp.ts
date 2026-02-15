// ─── CDP Advanced Trade API helpers ──────────────────────────────────────────
// All CDP calls are server-side (API key stays secret)

const CDP_BASE = "https://api.coinbase.com/api/v3/brokerage";

export interface Product {
  product_id: string;
  price: string;
  price_percentage_change_24h: string;
  volume_24h: string;
}

export interface Candle {
  start: string;
  low: string;
  high: string;
  open: string;
  close: string;
  volume: string;
}

// Public endpoint — no auth needed
export async function getProducts(productIds: string[]): Promise<Product[]> {
  try {
    const ids = productIds.join(",");
    const res = await fetch(
      `${CDP_BASE}/market/products?product_ids=${ids}`,
      { next: { revalidate: 10 } } // ISR: revalidate every 10s
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.products || [];
  } catch (e) {
    console.error("CDP getProducts failed:", e);
    return [];
  }
}

// Public candles — no auth needed
export async function getCandles(
  productId: string,
  granularity = "ONE_MINUTE",
  limit = 40
): Promise<Candle[]> {
  try {
    const end   = Math.floor(Date.now() / 1000);
    const start = end - limit * 60;
    const res = await fetch(
      `${CDP_BASE}/market/products/${productId}/candles?start=${start}&end=${end}&granularity=${granularity}&limit=${limit}`,
      { next: { revalidate: 30 } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return (data.candles || []).reverse(); // oldest → newest
  } catch (e) {
    console.error("CDP getCandles failed:", e);
    return [];
  }
}
