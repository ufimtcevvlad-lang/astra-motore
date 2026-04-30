import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { createRequire } from "module";
import sharp from "sharp";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const heicConvert = require("heic-convert") as (input: {
  buffer: Buffer;
  format: "JPEG";
  quality: number;
}) => Promise<ArrayBuffer>;

function detectImageKind(buf: Buffer): "jpeg" | "png" | "webp" | "heic" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return "png";
  if (
    buf.length >= 12 &&
    buf.slice(0, 4).toString("ascii") === "RIFF" &&
    buf.slice(8, 12).toString("ascii") === "WEBP"
  )
    return "webp";
  if (
    buf.length >= 12 &&
    buf.slice(4, 8).toString("ascii") === "ftyp" &&
    /^(heic|heix|hevc|hevx|mif1|msf1)$/i.test(buf.slice(8, 12).toString("ascii"))
  )
    return "heic";
  return null;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Файл не загружен" }, { status: 400 });
  }

  const maxSize = 20 * 1024 * 1024; // iPhone HEIC/JPEG can be larger than 5MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "Максимальный размер файла: 20MB" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const detected = detectImageKind(buffer);
  if (!detected) {
    return NextResponse.json({ error: "Допустимые форматы: JPEG, PNG, WebP, HEIC/HEIF" }, { status: 400 });
  }

  let out: Buffer;
  try {
    const imageBuffer =
      detected === "heic"
        ? Buffer.from(await heicConvert({ buffer, format: "JPEG", quality: 0.92 }))
        : buffer;

    out = await sharp(imageBuffer)
      .rotate()
      .resize(1400, 1400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch (err) {
    console.error("Admin image upload failed:", err);
    return NextResponse.json(
      { error: "Не удалось обработать изображение. Попробуйте другой файл или сохраните фото как JPEG." },
      { status: 400 },
    );
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "products");

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), out);

  const url = `/uploads/products/${filename}`;
  return NextResponse.json({ url });
}
