import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

// ─── Telegram ───

export async function sendTelegramNotification(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch {
    // fire-and-forget: ignore errors
  }
}

// ─── Web Push ───

export async function sendPushToAllAdmins(
  title: string,
  body: string,
  url?: string
): Promise<void> {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) return;

  const webpush = (await import("web-push")).default;

  webpush.setVapidDetails(
    "mailto:admin@gmshop66.ru",
    vapidPublicKey,
    vapidPrivateKey
  );

  const subscriptions = await db
    .select()
    .from(schema.pushSubscriptions);

  const payload = JSON.stringify({ title, body, url });

  await Promise.all(
    subscriptions.map(async (sub) => {
      const keys = JSON.parse(sub.keysJson) as { p256dh: string; auth: string };
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys },
          payload
        );
      } catch (err: unknown) {
        // Remove invalid/expired subscriptions (410 Gone or 404 Not Found)
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 410 || status === 404) {
          await db
            .delete(schema.pushSubscriptions)
            .where(eq(schema.pushSubscriptions.id, sub.id));
        }
      }
    })
  );
}

// ─── Combined ───

export async function notifyAdminsNewMessage(
  conversationId: number,
  preview: string
): Promise<void> {
  // Fetch customer name from DB
  const conv = await db
    .select({ customerName: schema.conversations.customerName })
    .from(schema.conversations)
    .where(eq(schema.conversations.id, conversationId))
    .limit(1);

  const customerName = conv[0]?.customerName || "Клиент";
  const shortPreview = preview.length > 100 ? preview.slice(0, 100) + "…" : preview;

  const telegramText =
    `💬 <b>Новое сообщение</b>\n` +
    `От: ${customerName}\n` +
    `${shortPreview}\n\n` +
    `<a href="/admin/conversations/${conversationId}">Открыть диалог</a>`;

  // Both fire-and-forget
  sendTelegramNotification(telegramText).catch(() => {});
  sendPushToAllAdmins(
    "Новое сообщение",
    `${customerName}: ${shortPreview}`,
    `/admin/conversations/${conversationId}`
  ).catch(() => {});
}
