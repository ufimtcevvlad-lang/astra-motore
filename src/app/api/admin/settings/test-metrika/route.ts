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
      inArray(schema.settings.key, ["metrika_token", "metrika_counter_id"])
    )
    .all();

  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;

  const token = map["metrika_token"];
  const counterId = map["metrika_counter_id"];

  if (!token || !counterId) {
    return NextResponse.json(
      { error: "Токен или ID счётчика Метрики не заданы" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://api-metrika.yandex.net/stat/v1/data?ids=${counterId}&metrics=ym:s:visits&date1=today&date2=today`,
      {
        headers: { Authorization: `OAuth ${token}` },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Ошибка Метрики: ${res.status} — ${text}` },
        { status: 400 }
      );
    }

    const data = await res.json();
    const visits = data?.data?.[0]?.metrics?.[0] ?? 0;

    return NextResponse.json({ ok: true, visits });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
