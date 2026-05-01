import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const SOURCES = ["images/catalog", "uploads/products"];
const OUT_ROOT = path.join(PUBLIC_DIR, "images/watermarked");
const IMG_RE = /\.(jpe?g|png|webp)$/i;
const BRAND = "GM SHOP 66.RU";
const AMBER = "#f5ae23";

async function walk(dir) {
  const out = [];
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walk(abs));
    } else if (entry.isFile() && IMG_RE.test(entry.name)) {
      out.push(abs);
    }
  }
  return out;
}

function xmlEscape(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cardSvg(width, height) {
  const size = Math.max(16, Math.round(Math.min(width, height) * 0.043));
  const pad = Math.max(12, Math.round(Math.min(width, height) * 0.03));
  const x = width - pad;
  const y = height - pad;
  return Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <text x="${x + 3}" y="${y + 3}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="700" fill="#181818" fill-opacity="0.46">${xmlEscape(BRAND)}</text>
  <text x="${x}" y="${y}" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="700" fill="${AMBER}" fill-opacity="0.96">${xmlEscape(BRAND)}</text>
</svg>`);
}

function fullSvg(width, height) {
  const fontSize = Math.max(42, Math.round(Math.min(width, height) * 0.064));
  const approxTextWidth = fontSize * 7.8;
  const spacingX = Math.round(approxTextWidth + fontSize * 2.8);
  const spacingY = Math.round(fontSize * 3.45);
  const margin = Math.max(width, height);
  const sw = width + margin * 2;
  const sh = height + margin * 2;
  const items = [];
  let row = 0;

  for (let y = -spacingY; y < sh + spacingY; y += spacingY) {
    const offset = row % 2 ? Math.round(spacingX * 0.55) : 0;
    for (let x = -spacingX - offset; x < sw + spacingX; x += spacingX) {
      items.push(`<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="700" fill="${AMBER}" fill-opacity="0.31">${xmlEscape(BRAND)}</text>`);
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

async function needsBuild(src, dest) {
  try {
    const [srcStat, destStat] = await Promise.all([stat(src), stat(dest)]);
    return srcStat.mtimeMs > destStat.mtimeMs;
  } catch {
    return true;
  }
}

async function renderOne(src, variant) {
  const rel = path.relative(PUBLIC_DIR, src);
  const dest = path.join(OUT_ROOT, variant, rel).replace(/\.(jpe?g|png|webp)$/i, ".webp");
  if (!(await needsBuild(src, dest))) return { skipped: true };

  const meta = await sharp(src).rotate().metadata();
  const width = meta.width ?? 1200;
  const height = meta.height ?? 1200;
  const svg = variant === "card" ? cardSvg(width, height) : fullSvg(width, height);

  await mkdir(path.dirname(dest), { recursive: true });
  await sharp(src)
    .rotate()
    .composite([{ input: svg, blend: "over" }])
    .webp({ quality: 84, effort: 4 })
    .toFile(dest);

  return { skipped: false };
}

async function main() {
  const sources = [];
  for (const source of SOURCES) {
    sources.push(...await walk(path.join(PUBLIC_DIR, source)));
  }

  let built = 0;
  let skipped = 0;
  for (const src of sources) {
    for (const variant of ["card", "full"]) {
      const result = await renderOne(src, variant);
      if (result.skipped) skipped += 1;
      else built += 1;
    }
  }

  console.log(`Watermarked images: ${built} built, ${skipped} skipped, ${sources.length} source files.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
