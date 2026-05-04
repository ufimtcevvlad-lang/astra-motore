import { readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

type Sample = {
  width: number;
  height: number;
  gray: Uint8Array;
};

function otsuThreshold(values: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (const value of values) hist[value] += 1;

  const total = values.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];

  let sumB = 0;
  let weightB = 0;
  let bestVariance = -1;
  let threshold = 128;

  for (let i = 0; i < 256; i++) {
    weightB += hist[i];
    if (weightB === 0) continue;
    const weightF = total - weightB;
    if (weightF === 0) break;

    sumB += i * hist[i];
    const meanB = sumB / weightB;
    const meanF = (sum - sumB) / weightF;
    const variance = weightB * weightF * (meanB - meanF) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      threshold = i;
    }
  }

  return Math.min(190, Math.max(65, threshold));
}

async function makeSample(input: Buffer): Promise<Sample> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize(420, 420, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const gray = new Uint8Array(info.width * info.height);
  for (let i = 0, p = 0; i < data.length; i += info.channels, p++) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? r;
    const b = data[i + 2] ?? g;
    gray[p] = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
  }

  return { width: info.width, height: info.height, gray };
}

function transitionRate(bits: Uint8Array, width: number, height: number, x: number, y: number, size: number): number {
  const step = Math.max(2, Math.floor(size / 42));
  let changes = 0;
  let checks = 0;

  for (let row = y; row < y + size; row += step) {
    let prev = bits[row * width + x];
    for (let col = x + step; col < x + size; col += step) {
      const current = bits[row * width + col];
      if (current !== prev) changes += 1;
      prev = current;
      checks += 1;
    }
  }

  for (let col = x; col < x + size; col += step) {
    let prev = bits[y * width + col];
    for (let row = y + step; row < y + size; row += step) {
      const current = bits[row * width + col];
      if (current !== prev) changes += 1;
      prev = current;
      checks += 1;
    }
  }

  return checks === 0 ? 0 : changes / checks;
}

function squareScore(sample: Sample, x: number, y: number, size: number, threshold: number): number {
  const { width, gray } = sample;
  const bits = new Uint8Array(width * sample.height);
  for (let i = 0; i < gray.length; i++) bits[i] = gray[i] < threshold ? 1 : 0;

  let dark = 0;
  let nearBlack = 0;
  let nearWhite = 0;
  let sum = 0;
  let sumSq = 0;

  for (let row = y; row < y + size; row++) {
    const offset = row * width;
    for (let col = x; col < x + size; col++) {
      const value = gray[offset + col];
      sum += value;
      sumSq += value * value;
      if (value < threshold) dark += 1;
      if (value <= 75) nearBlack += 1;
      if (value >= 178) nearWhite += 1;
    }
  }

  const area = size * size;
  const darkRatio = dark / area;
  const bwRatio = (nearBlack + nearWhite) / area;
  const mean = sum / area;
  const std = Math.sqrt(Math.max(0, sumSq / area - mean * mean));
  const transitions = transitionRate(bits, width, sample.height, x, y, size);

  if (darkRatio < 0.18 || darkRatio > 0.64) return 0;
  if (bwRatio < 0.5) return 0;
  if (std < 48) return 0;
  if (transitions < 0.17) return 0;

  return bwRatio * 0.35 + Math.min(std / 95, 1) * 0.25 + Math.min(transitions / 0.34, 1) * 0.4;
}

export async function looksLikeQrSeparatorPhoto(input: Buffer): Promise<boolean> {
  const sample = await makeSample(input);
  const minSide = Math.min(sample.width, sample.height);
  if (minSide < 120) return false;

  const threshold = otsuThreshold(sample.gray);
  let best = 0;

  for (const ratio of [0.32, 0.4, 0.5, 0.62, 0.74]) {
    const size = Math.max(96, Math.floor(minSide * ratio));
    const step = Math.max(16, Math.floor(size / 4));
    for (let y = 0; y <= sample.height - size; y += step) {
      for (let x = 0; x <= sample.width - size; x += step) {
        best = Math.max(best, squareScore(sample, x, y, size, threshold));
        if (best >= 0.78) return true;
      }
    }
  }

  return best >= 0.78;
}

function resolvePublicProductImage(imagePath: string): string | null {
  if (!imagePath.startsWith("/uploads/products/") && !imagePath.startsWith("/images/catalog/")) {
    return null;
  }

  const publicRoot = path.join(process.cwd(), "public");
  const normalized = path.normalize(path.join(publicRoot, imagePath));
  if (!normalized.startsWith(`${publicRoot}${path.sep}`)) return null;
  return normalized;
}

export async function findQrSeparatorProductImage(imagePaths: unknown[]): Promise<string | null> {
  const uniquePaths = [...new Set(imagePaths.filter((value): value is string => typeof value === "string"))];

  for (const imagePath of uniquePaths) {
    const filePath = resolvePublicProductImage(imagePath);
    if (!filePath) continue;

    try {
      const buffer = await readFile(filePath);
      if (await looksLikeQrSeparatorPhoto(buffer)) return imagePath;
    } catch {
      // Existing broken/missing paths are handled elsewhere; this guard only blocks confirmed QR junk.
    }
  }

  return null;
}
