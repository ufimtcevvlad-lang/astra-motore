import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

type Body = {
  name: string;
  email: string;
  vin: string;
  brand: string;
  model: string;
  engine: string;
  transmission: string;
  year: string;
  carBody: string;
  request: string;
  consentPersonalData: boolean;
  consentMarketing?: boolean;
  comment?: string;
};

function escapeTelegram(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function persistVinRequest(
  entry: Body & { createdAt: string; ip?: string; photoName?: string; photoSize?: number }
) {
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "vin-requests.ndjson");
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(file, JSON.stringify(entry) + "\n", "utf8");
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json(
      {
        error:
          "Telegram не настроен: добавьте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env.local",
      },
      { status: 500 }
    );
  }

  const contentType = request.headers.get("content-type") || "";

  let requestBody: Body;
  let photoFile: File | null = null;
  let photoMeta: { fileName?: string; size?: number } | undefined = undefined;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const getStr = (k: string) => {
      const v = form.get(k);
      if (typeof v !== "string") return "";
      return v;
    };

    const photoEntry = form.get("photo");
    if (photoEntry && typeof photoEntry !== "string") {
      photoFile = photoEntry as File;
      photoMeta = { fileName: photoFile.name, size: photoFile.size };
    }

    requestBody = {
      name: getStr("name"),
      email: getStr("email"),
      vin: getStr("vin"),
      brand: getStr("brand"),
      model: getStr("model"),
      engine: getStr("engine"),
      transmission: getStr("transmission"),
      year: getStr("year"),
      carBody: getStr("body"),
      request: getStr("request"),
      consentPersonalData: getStr("consentPersonalData") === "true",
      consentMarketing: getStr("consentMarketing") === "true",
      comment: getStr("comment") || undefined,
    };
  } else {
    try {
      const json = (await request.json()) as Partial<Body> & { body?: string };
      requestBody = {
        name: String(json.name || ""),
        email: String(json.email || ""),
        vin: String(json.vin || ""),
        brand: String(json.brand || ""),
        model: String(json.model || ""),
        engine: String(json.engine || ""),
        transmission: String(json.transmission || ""),
        year: String(json.year || ""),
        // backward compatible: accept old key "body" from clients
        carBody: String(json.carBody || json.body || ""),
        request: String(json.request || ""),
        consentPersonalData: Boolean(json.consentPersonalData),
        consentMarketing: Boolean(json.consentMarketing),
        comment: typeof json.comment === "string" ? json.comment : undefined,
      };
    } catch {
      return NextResponse.json(
        { error: "Неверный формат данных" },
        { status: 400 }
      );
    }
    // no photo
  }

  const {
    name,
    email,
    vin,
    brand,
    model,
    engine,
    transmission,
    year,
    carBody,
    request: requestText,
    consentPersonalData,
    consentMarketing,
    comment,
  } = requestBody;

  const vinNorm = String(vin || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const emailNorm = String(email || "").trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm);

  if (
    !name?.trim() ||
    !emailNorm ||
    !emailValid ||
    !vinNorm ||
    vinNorm.length !== 17 ||
    !brand?.trim() ||
    !requestText?.trim() ||
    !consentPersonalData
  ) {
    return NextResponse.json(
      { error: "Не заполнены имя, email, VIN (17 символов), марка, запрос или согласие ПДн" },
      { status: 400 }
    );
  }

  const payload: Body = {
    ...requestBody,
    name: name.trim(),
    email: emailNorm,
    vin: vinNorm,
    brand: brand.trim(),
    model: String(model || "").trim(),
    engine: String(engine || "").trim(),
    transmission: String(transmission || "").trim(),
    year: String(year || "").trim(),
    carBody: String(carBody || "").trim(),
    request: requestText.trim(),
    consentPersonalData: Boolean(consentPersonalData),
    consentMarketing: Boolean(consentMarketing),
    comment: comment?.trim() || undefined,
  };

  // Не блокируем отправку в Telegram, даже если не удалось сохранить лог.
  try {
    await persistVinRequest({
      ...payload,
      createdAt: new Date().toISOString(),
      ip:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        undefined,
      photoName: photoMeta?.fileName,
      photoSize: photoMeta?.size,
    });
  } catch {
    // ignore
  }

  const lines: string[] = [
    "🧾 <b>Новый VIN-запрос — Astra Motors</b>",
    "",
    "👤 <b>Имя:</b> " + escapeTelegram(payload.name),
    "📧 <b>Email:</b> " + escapeTelegram(payload.email),
    "🆔 <b>VIN:</b> " + escapeTelegram(payload.vin),
    "🚗 <b>Авто:</b> " +
      [
        payload.brand,
        payload.model || null,
        payload.engine || null,
        payload.transmission || null,
        payload.year || null,
        payload.carBody || null,
      ]
        .filter(Boolean)
        .join(" / "),
    "",
    "🧩 <b>Что нужно:</b> " + escapeTelegram(payload.request),
  ];

  if (payload.comment) {
    lines.push("", "💬 <b>Комментарий:</b> " + escapeTelegram(payload.comment));
  }

  const text = lines.join("\n");

  try {
    if (photoFile) {
      const tgForm = new FormData();
      tgForm.append("chat_id", String(chatId));
      tgForm.append("caption", text);
      tgForm.append("parse_mode", "HTML");
      tgForm.append("disable_web_page_preview", "true");

      // photoFile is a File-like object; append directly
      tgForm.append("photo", photoFile, photoFile.name || "photo");

      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: "POST",
        body: tgForm,
      });

      const data = await res.json();
      if (!data.ok) {
        return NextResponse.json(
          { error: data.description || "Ошибка Telegram" },
          { status: 502 }
        );
      }
    } else {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        return NextResponse.json(
          { error: data.description || "Ошибка Telegram" },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Ошибка отправки в Telegram" },
      { status: 502 }
    );
  }
}

