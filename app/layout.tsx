import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://gcoinagent.vercel.app";

const frameEmbed = {
  version: "1",
  imageUrl: `${APP_URL}/og-image.png`,
  button: {
    title: "⚡ Live Crypto Signals",
    action: {
      type: "launch_frame",
      name: "GcoinAgent",
      url: `${APP_URL}/miniapp`,
      splashImageUrl: `${APP_URL}/splash.png`,
      splashBackgroundColor: "#050510",
    },
  },
};

export const metadata: Metadata = {
  title: "GcoinAgent — Live Crypto Signals",
  description: "Autonomous AI trading signals powered by CDP Trade API.",
  other: {
    "fc:miniapp": JSON.stringify(frameEmbed),
    "fc:frame": JSON.stringify(frameEmbed),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#050510" }}>
        {children}
      </body>
    </html>
  );
}
