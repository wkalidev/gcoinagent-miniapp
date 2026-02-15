// ─── Technical indicators ─────────────────────────────────────────────────────

export interface Candle {
  o: number; c: number; h: number; l: number;
}

export function calcRSI(candles: Candle[]): number {
  if (candles.length < 2) return 50;
  let g = 0, l = 0;
  const n = Math.min(14, candles.length - 1);
  for (let i = candles.length - n; i < candles.length; i++) {
    const d = candles[i].c - candles[i - 1].c;
    if (d > 0) g += d; else l -= d;
  }
  g /= n; l /= n;
  return l === 0 ? 100 : Math.round(100 - 100 / (1 + g / l));
}

export function calcMACD(candles: Candle[]) {
  const c = candles.map(x => x.c);
  const e12 = c.slice(-12).reduce((a, b) => a + b, 0) / Math.min(12, c.length);
  const e26 = c.slice(-26).reduce((a, b) => a + b, 0) / Math.min(26, c.length);
  return { val: e12 - e26, sig: (e12 - e26) * 0.9 };
}

export function calcBollinger(candles: Candle[]) {
  const c = candles.slice(-20).map(x => x.c);
  const mean = c.reduce((a, b) => a + b, 0) / c.length;
  const std  = Math.sqrt(c.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / c.length);
  return { up: mean + 2 * std, mid: mean, dn: mean - 2 * std };
}

export type SignalType = "BUY" | "SELL" | "HOLD";
export type Strength   = "STRONG" | "MODERATE" | "NEUTRAL";

export function getSignal(rsi: number, macd: { val: number; sig: number }): {
  type: SignalType;
  strength: Strength;
} {
  if (rsi < 30 && macd.val > macd.sig) return { type: "BUY",  strength: "STRONG"   };
  if (rsi < 45 && macd.val > macd.sig) return { type: "BUY",  strength: "MODERATE" };
  if (rsi > 70 && macd.val < macd.sig) return { type: "SELL", strength: "STRONG"   };
  if (rsi > 55 && macd.val < macd.sig) return { type: "SELL", strength: "MODERATE" };
  return { type: "HOLD", strength: "NEUTRAL" };
}
