#!/usr/bin/env node
/**
 * Пакетная обработка фото в public/images/catalog:
 * - EXIF-поворот (sharp.rotate())
 * - вписать в 1600×1600 без увеличения мелких
 * - PNG: сжатие; JPEG: mozjpeg; WebP: quality 85
 * Если результат крупнее исходника >5% — файл не трогаем.
 */
import sharp from "sharp";
import { readdir, stat, unlink, rename } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "public", "images", "catalog");
const MAX_EDGE = 1600;
const EXT = /\.(png|jpe?g|webp)$/i;

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (EXT.test(e.name) && e.name.toLowerCase() !== "_pending.jpg") {
      out.push(full);
    }
  }
  return out;
}

async function processFile(file) {
  const before = (await stat(file)).size;
  const ext = path.extname(file).toLowerCase();
  const tmp = file + ".opt.tmp";

  const meta = await sharp(file).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const needsResize = w > MAX_EDGE || h > MAX_EDGE;

  // PNG/WebP при типичном размере <1600 уже сжаты; повторный PNG encode часто раздувает файл — пропускаем.
  if (!needsResize && (ext === ".png" || ext === ".webp")) {
    return { file, before, after: before, skipped: "no-resize-lossless" };
  }

  let pipeline = sharp(file).rotate().resize(MAX_EDGE, MAX_EDGE, {
    fit: "inside",
    withoutEnlargement: true,
  });

  if (ext === ".png") {
    await pipeline.png({ compressionLevel: 9, effort: 10 }).toFile(tmp);
  } else if (ext === ".jpg" || ext === ".jpeg") {
    await pipeline.jpeg({ quality: 88, mozjpeg: true }).toFile(tmp);
  } else if (ext === ".webp") {
    await pipeline.webp({ quality: 85 }).toFile(tmp);
  } else {
    return { file, skipped: "unknown-ext" };
  }

  const after = (await stat(tmp)).size;
  if (after > before * 1.05) {
    await unlink(tmp);
    return { file, before, after: before, skipped: "larger-output" };
  }

  await rename(tmp, file);
  return { file, before, after };
}

async function main() {
  const files = await walk(ROOT);
  console.log(`→ Найдено файлов: ${files.length}`);
  let saved = 0;
  let skippedLarger = 0;
  let skippedNoResize = 0;
  let errors = 0;

  for (const file of files) {
    try {
      const r = await processFile(file);
      if (r.skipped === "larger-output") {
        skippedLarger++;
        console.log(`  skip (больше исходника): ${path.relative(ROOT, r.file)}`);
      } else if (r.skipped === "no-resize-lossless") {
        skippedNoResize++;
      } else if (r.skipped) {
        console.log(`  skip: ${path.relative(ROOT, r.file)} ${r.skipped}`);
      } else {
        const delta = r.before - r.after;
        saved += delta;
        const pct = ((1 - r.after / r.before) * 100).toFixed(1);
        console.log(
          `  ok ${path.relative(ROOT, r.file)}  ${(r.before / 1024).toFixed(0)} → ${(r.after / 1024).toFixed(0)} KiB (−${pct}%)`,
        );
      }
    } catch (e) {
      errors++;
      console.error(`  ERR ${path.relative(ROOT, file)}`, e.message);
      try {
        await unlink(file + ".opt.tmp");
      } catch {
        /* ignore */
      }
    }
  }

  console.log(`→ Сэкономлено всего: ${(saved / 1024 / 1024).toFixed(2)} MiB`);
  console.log(
    `→ Пропущено PNG/WebP без даунскейла (<${MAX_EDGE}px): ${skippedNoResize}; крупнее после перекодирования: ${skippedLarger}; ошибок: ${errors}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
