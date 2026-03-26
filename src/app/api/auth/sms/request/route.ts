import { NextResponse } from "next/server";
import { createSmsCodeForPhone } from "../../../../lib/auth";
import { appendConsentLog } from "../../../../lib/consent-log";

type Body = {
  phone: string;
  debug?: boolean;
  consentPersonalData?: boolean;
};

async function getClientIp(request: Request): Promise<string | undefined> {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}

async function sendCodeViaSmsRu(
  phone: string,
  code: string,
  request: Request,
  debug: boolean
): Promise<{ smsru: unknown }> {
  const apiId = process.env.SMSRU_API_ID;
  if (!apiId) throw new Error("SMS.ru не настроен: задайте SMSRU_API_ID");
  const sender = process.env.SMSRU_SENDER;

  const message = `Astra Motors. Код подтверждения: ${code}`;
  const ip = await getClientIp(request);

  const params = new URLSearchParams({
    api_id: apiId,
    to: phone,
    msg: message,
    json: "1",
  });
  if (sender) params.set("from", sender);
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

  return { smsru: debug ? data : { status: data?.status, status_code: data?.status_code } };
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
  }

  const debug = Boolean(body.debug);
  if (!body.consentPersonalData) {
    return NextResponse.json(
      { error: "Необходимо согласие на обработку персональных данных" },
      { status: 400 }
    );
  }

  try {
    await appendConsentLog({
      event: "auth_login_sms_request",
      consentPersonalData: true,
      ip: await getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      subject: {
        phone: body.phone,
      },
    });
  } catch {
    // ignore consent log errors
  }
  const result = await createSmsCodeForPhone(String(body.phone || ""));
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  try {
    const smsru = await sendCodeViaSmsRu(result.phone, result.code, request, debug);
    if (debug) {
      return NextResponse.json({ ok: true, message: "Код отправлен", smsru });
    }
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

