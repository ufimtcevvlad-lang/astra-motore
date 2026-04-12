import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { inArray } from "drizzle-orm";

export async function POST() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const rows = db
    .select()
    .from(schema.settings)
    .where(
      inArray(schema.settings.key, [
        "notification_telegram_bot_token",
        "notification_telegram_chat_id",
      ])
    )
    .all();

  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const token = map["notification_telegram_bot_token"];
  const chatId = map["notification_telegram_chat_id"];

  if (!token || !chatId) {
    return NextResponse.json(
      { error: "Telegram Bot Token или Chat ID не заданы" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Тестовое сообщение от Astra Motors Admin",
        }),
      }
    );

    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json(
        { error: data.description || "Ошибка Telegram API" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
