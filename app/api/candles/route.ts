import { getCandles } from "../../../lib/cdp";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId   = searchParams.get("id")           || "BTC-USD";
  const granularity = searchParams.get("granularity")   || "ONE_MINUTE";
  const limit       = parseInt(searchParams.get("limit") || "40");
  const candles = await getCandles(productId, granularity, limit);
  return Response.json({ candles, productId, updatedAt: new Date().toISOString() });
}
