import { NextResponse } from "next/server";
import { getCdekPickupPoints } from "../../../lib/cdek";

type Body = {
  city: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  if (!body.city?.trim()) {
    return NextResponse.json({ error: "Укажите город для поиска ПВЗ" }, { status: 400 });
  }

  try {
    const points = await getCdekPickupPoints(body.city.trim());

    return NextResponse.json({
      ok: true,
      points: points.slice(0, 20),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка CDEK";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

