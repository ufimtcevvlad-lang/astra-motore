import { NextResponse } from "next/server";
import { createSmsCodeForPhone } from "../../../../lib/auth";

type Body = {
  phone: string;
};

async function getClientIp(request: Request): Promise<string | undefined> {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}

async function sendCodeViaSmsRu(phone: string, code: string, request: Request): Promise<void> {
  const apiId = process.env.SMSRU_API_ID;
  if (!apiId) throw new Error("SMS.ru не настроен: задайте SMSRU_API_ID");

  const message = `Astra Motors. Код подтверждения: ${code}`;
  const ip = await getClientIp(request);

  const params = new URLSearchParams({
    api_id: apiId,
    to: phone,
    msg: message,
    json: "1",
  });
  if (ip) params.set("ip", ip);

  // Важно: sms.ru рекомендует ставить captcha на стороне веба.
  // В нашем случае отправка происходит по серверному API, поэтому используем минимальную схему.
  const res = await fetch(`https://sms.ru/sms/send?${params.toString()}`, {
    method: "GET",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.status !== "OK" || data?.status_code !== 100) {
    const detail =
      data?.sms?.[phone]?.status_text ||
      data?.status_text ||
      data?.message ||
      JSON.stringify(data).slice(0, 300);
    throw new Error(`SMS.ru отправка не удалась: ${detail}`);
  }
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const result = await createSmsCodeForPhone(String(body.phone || ""));
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  try {
    await sendCodeViaSmsRu(result.phone, result.code, request);
    return NextResponse.json({ ok: true, message: "Код отправлен" });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        ok: true,
        message: "Код создан (dev fallback)",
        devCode: result.code,
      });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Не удалось отправить код" },
      { status: 500 }
    );
  }
}

