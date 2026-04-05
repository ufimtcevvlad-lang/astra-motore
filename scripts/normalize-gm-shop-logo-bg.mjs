#!/usr/bin/env node
/**
 * Подгоняет однотонный тёмно-серый фон gm-shop-logo.jpg под цвет шапки (#05070A).
 * Запуск: node scripts/normalize-gm-shop-logo-bg.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public/brand/gm-shop-logo.jpg");
const out = path.join(root, "public/brand/gm-shop-logo-header.png");

const HR = 5;
const HG = 7;
const HB = 10;

const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const ch = info.channels;
if (ch !== 3) {
  console.error("Ожидался RGB JPEG, channels=", ch);
  process.exit(1);
}

for (let i = 0; i < data.length; i += ch) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  const spread = max - min;
  if (max < 42 && spread < 14) {
    data[i] = HR;
    data[i + 1] = HG;
    data[i + 2] = HB;
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 3 },
})
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log("→", path.relative(root, out), `(${info.width}×${info.height})`);
