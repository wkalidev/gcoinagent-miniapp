# 🤖 GcoinAgent — Farcaster Mini App

Autonomous crypto AI trading signals powered by [CDP Advanced Trade API](https://portal.cdp.coinbase.com/).

**By [@willywarrior](https://farcaster.xyz/willywarrior) · Follow [@willycodexwar](https://x.com/willycodexwar) on X**

---

## ⚡ Features

- 🔴 **Live prices** via CDP Advanced Trade API (no auth needed for public endpoints)
- 📊 **RSI + MACD + Bollinger Bands** technical indicators
- 🤖 **Autonomous BUY/SELL/HOLD signals** for top 10 cryptos
- 💎 **Subscription plans** paid in USDC on Base (Free / Pro $10 / Premium $25)
- 🔔 **Push notifications** via Farcaster Mini App SDK
- 💰 **Creator Rewards** eligible (Farcaster distributes $25K+/week)

---

## 🛠 Tech Stack

| Layer       | Tech                          |
|-------------|-------------------------------|
| Framework   | Next.js 14 (App Router)       |
| Language    | TypeScript                    |
| Prices      | CDP Advanced Trade API        |
| Payments    | USDC on Base via Farcaster SDK|
| Deployment  | Vercel                        |

---

## 🚀 Quick Start

### 1. Clone & install
```bash
git clone https://github.com/willycodexwar/gcoinagent-miniapp
cd gcoinagent-miniapp
pnpm install
```

### 2. Set environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

### 3. Run locally
```bash
pnpm dev
# → http://localhost:3000
```

### 4. Test as a Farcaster Frame
Go to: https://warpcast.com/~/developers/frame-playground  
Enter: `http://localhost:3000`  
*(Use ngrok for public URL: `ngrok http 3000`)*

---

## 💰 Monetization

| Revenue | Source |
|---------|--------|
| **$10/mo** | Pro subscriptions (USDC on Base) |
| **$25/mo** | Premium subscriptions (USDC on Base) |
| **$25K+/week** | Farcaster Creator Rewards pool |
| **Tips** | $DEGEN tips from followers |

---

## 📁 Project Structure

```
gcoinagent-miniapp/
├── app/
│   ├── layout.tsx              ← Farcaster meta tags (fc:miniapp)
│   ├── page.tsx                ← Redirects to /miniapp
│   ├── miniapp/page.tsx        ← Main Mini App entry
│   └── api/
│       ├── prices/route.ts     ← CDP live prices endpoint
│       ├── candles/route.ts    ← CDP candles endpoint
│       └── webhook/route.ts    ← Farcaster notifications webhook
├── components/
│   └── GcoinMiniApp.tsx        ← Main UI component
├── lib/
│   ├── cdp.ts                  ← CDP API helpers
│   └── signals.ts              ← RSI / MACD / Bollinger
└── public/
    └── .well-known/
        └── farcaster.json      ← Mini App manifest
```

---

## 🔗 Deployment

1. Push to GitHub
2. Connect to [Vercel](https://vercel.com) → auto-deploy
3. Add env vars in Vercel dashboard
4. Generate manifest at: https://warpcast.com/~/developers/mini-apps/manifest
5. Update `NEXT_PUBLIC_APP_URL` to your Vercel URL

---

*Built with ❤️ by @willywarrior*
