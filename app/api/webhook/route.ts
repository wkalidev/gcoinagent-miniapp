// ─── Farcaster Miniapp Webhook ────────────────────────────────────────────────
// Handles: frame_added, frame_removed, notifications_enabled, notifications_disabled

interface WebhookPayload {
  event: "frame_added" | "frame_removed" | "notifications_enabled" | "notifications_disabled";
  notificationDetails?: { token: string; url: string };
  fid: number;
}

// In production: store tokens in a DB (Supabase, PlanetScale, Upstash, etc.)
const tokenStore = new Map<number, { token: string; url: string }>();

// ─── Helper: send a signal notification to a user (NON EXPORTÉE) ─────────────
async function sendNotification(fid: number, title: string, body: string) {
  const userData = tokenStore.get(fid);
  if (!userData) return;

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://gcoinagent.vercel.app";

  await fetch(userData.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notificationId: crypto.randomUUID(),
      title,
      body,
      targetUrl: `${APP_URL}/miniapp`,
      tokens: [userData.token],
    }),
  });
}

export async function POST(req: Request) {
  try {
    const body: WebhookPayload = await req.json();
    console.log("🟣 Farcaster webhook:", body.event, "fid:", body.fid);

    switch (body.event) {
      case "frame_added":
      case "notifications_enabled":
        if (body.notificationDetails) {
          tokenStore.set(body.fid, body.notificationDetails);
          console.log(`✅ Saved notification token for fid ${body.fid}`);
        }
        break;

      case "frame_removed":
      case "notifications_disabled":
        tokenStore.delete(body.fid);
        console.log(`🗑 Removed token for fid ${body.fid}`);
        break;
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error("Webhook error:", e);
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
}
