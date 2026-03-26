import { NextResponse } from "next/server";
import { calculateCdekTariffList } from "../../../lib/cdek";

type Body = {
  city: string;
  itemsCount: number;
  declaredValue: number;
};

function getPackageForItems(itemsCount: number) {
  const count = Math.max(1, Math.min(50, Math.floor(itemsCount)));
  const baseWeightPerItemGrams = Number(process.env.CDEK_WEIGHT_PER_ITEM_GRAMS || 800);

  return {
    weight: count * baseWeightPerItemGrams,
    length: 30,
    width: 20,
    height: Math.min(60, 10 + count * 2),
  };
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  if (!body.city?.trim()) {
    return NextResponse.json({ error: "Укажите город доставки" }, { status: 400 });
  }

  try {
    const tariffs = await calculateCdekTariffList({
      toCity: body.city.trim(),
      declaredValue: body.declaredValue || 1,
      packageData: getPackageForItems(body.itemsCount || 1),
    });

    const best = [...tariffs]
      .filter((t) => typeof t.delivery_sum === "number")
      .sort((a, b) => a.delivery_sum - b.delivery_sum)[0];

    if (!best) {
      return NextResponse.json({ error: "Не удалось рассчитать доставку для выбранного города" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      best: {
        tariffCode: best.tariff_code,
        tariffName: best.tariff_name,
        deliverySum: best.delivery_sum,
        periodMin: best.period_min ?? null,
        periodMax: best.period_max ?? null,
      },
      alternatives: tariffs.slice(0, 5).map((t) => ({
        tariffCode: t.tariff_code,
        tariffName: t.tariff_name,
        deliverySum: t.delivery_sum,
        periodMin: t.period_min ?? null,
        periodMax: t.period_max ?? null,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка CDEK";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

