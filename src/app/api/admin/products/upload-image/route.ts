import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { createRequire } from "module";
import sharp from "sharp";
import { looksLikeQrSeparatorPhoto } from "@/app/lib/qr-image-guard";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const heicConvert = require("heic-convert") as (input: {
  buffer: Buffer;
  format: "JPEG";
  quality: number;
}) => Promise<ArrayBuffer>;
const BRAND_WATERMARK = "GM SHOP 66.RU";
const WATERMARK_AMBER = "#f5ae23";

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

function escapeSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cardWatermarkSvg(width: number, height: number): Buffer {
  const size = Math.max(16, Math.round(Math.min(width, height) * 0.043));
  const pad = Math.max(12, Math.round(Math.min(width, height) * 0.03));
  const x = width - pad;
  const y = height - pad;

  return Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="${x + 3}" y="${y + 3}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="700" fill="#181818" fill-opacity="0.46">${escapeSvgText(BRAND_WATERMARK)}</text>
  <text x="${x}" y="${y}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="700" fill="${WATERMARK_AMBER}" fill-opacity="0.96">${escapeSvgText(BRAND_WATERMARK)}</text>
</svg>`);
}

function fullWatermarkSvg(width: number, height: number): Buffer {
  const fontSize = Math.max(42, Math.round(Math.min(width, height) * 0.064));
  const approxTextWidth = fontSize * 7.8;
  const spacingX = Math.round(approxTextWidth + fontSize * 2.8);
  const spacingY = Math.round(fontSize * 3.45);
  const margin = Math.max(width, height);
  const sw = width + margin * 2;
  const sh = height + margin * 2;
  const items: string[] = [];
  let row = 0;

  for (let y = -spacingY; y < sh + spacingY; y += spacingY) {
    const offset = row % 2 ? Math.round(spacingX * 0.55) : 0;
    for (let x = -spacingX - offset; x < sw + spacingX; x += spacingX) {
      items.push(`<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="${WATERMARK_AMBER}" fill-opacity="0.31">${escapeSvgText(BRAND_WATERMARK)}</text>`);
    }
    row += 1;
  }

  return Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(${-margin} ${-margin}) rotate(-38 ${sw / 2} ${sh / 2})">
    ${items.join("\n")}
  </g>
</svg>`);
}

async function writeWatermarkedUploads(filename: string, source: Buffer): Promise<void> {
  const meta = await sharp(source).metadata();
  const width = meta.width ?? 1200;
  const height = meta.height ?? 1200;
  const variants = [
    { name: "card", svg: cardWatermarkSvg(width, height) },
    { name: "full", svg: fullWatermarkSvg(width, height) },
  ] as const;

  for (const variant of variants) {
    const outDir = path.join(process.cwd(), "public", "images", "watermarked", variant.name, "uploads", "products");
    await mkdir(outDir, { recursive: true });
    await sharp(source)
      .composite([{ input: variant.svg, blend: "over" }])
      .webp({ quality: 84, effort: 4 })
      .toFile(path.join(outDir, filename));
  }
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

    if (await looksLikeQrSeparatorPhoto(imageBuffer)) {
      return NextResponse.json(
        { error: "Это похоже на QR-разделитель парсера, а не фото товара. Такое фото не загружено." },
        { status: 400 },
      );
    }

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
  await writeWatermarkedUploads(filename, out);

  const url = `/uploads/products/${filename}`;
  return NextResponse.json({ url });
}
