import { getProducts } from "../../../lib/cdp";

const PRODUCT_IDS = [
  "BTC-USD","ETH-USD","SOL-USD","BNB-USD","XRP-USD",
  "ADA-USD","AVAX-USD","DOGE-USD","LINK-USD","MATIC-USD",
];

export async function GET() {
  const products = await getProducts(PRODUCT_IDS);
  return Response.json({ products, updatedAt: new Date().toISOString() });
}
