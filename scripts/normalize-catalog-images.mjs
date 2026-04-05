#!/usr/bin/env node
/**
 * Пакетная обработка фото в public/images/catalog:
 *
 * Режим --to-webp (основной для карточек, экономия места + читаемость этикеток):
 *   - EXIF-поворот, вписать в 1600×1600 без апскейла
 *   - PNG с альфой: flatten на #ffffff (как фотобокс)
 *   - Сохранение в WebP quality 86 (при необходимости второй проход quality 80)
 *   - PNG/JPEG исходники удаляются, путь становится .webp; существующий .webp перезаписывается
 *   - Автозамена путей в src/app/data/products.ts и public/images/catalog/commons-sources.json
 *
 * Legacy (без --to-webp):
 *   - PNG/JPEG/WebP: как раньше; флаг --recompress-png трогает мелкие PNG
 *   - Если выход крупнее исходника >5% — файл не подменяем
 */
import sharp from "sharp";
import { readdir, stat, unlink, rename, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "public", "images", "catalog");
const MAX_EDGE = 1600;
const EXT = /\.(png|jpe?g|webp)$/i;

const PRODUCTS_TS = path.join(__dirname, "..", "src", "app", "data", "products.ts");
const COMMONS_JSON = path.join(ROOT, "commons-sources.json");

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

function toPublicPath(absFile) {
  return "/images/catalog/" + path.relative(ROOT, absFile).replace(/\\/g, "/");
}

async function patchReferenceFiles(urlMappings) {
  if (urlMappings.length === 0) return;
  const sorted = [...urlMappings].sort((a, b) => b[0].length - a[0].length);
  const files = [PRODUCTS_TS, COMMONS_JSON];
  for (const file of files) {
    try {
      let s = await readFile(file, "utf8");
      let n = 0;
      for (const [from, to] of sorted) {
        if (from === to) continue;
        const before = s;
        s = s.split(from).join(to);
        if (s !== before) n++;
      }
      if (n > 0) {
        await writeFile(file, s, "utf8");
        console.log(`→ Обновлены пути в ${path.relative(path.join(__dirname, ".."), file)}`);
      }
    } catch (e) {
      if (e.code !== "ENOENT") console.warn(`  skip patch ${file}:`, e.message);
    }
  }
}

async function encodeWebpToTmp(file, quality, tmp) {
  const meta = await sharp(file).metadata();
  let p = sharp(file).rotate().resize(MAX_EDGE, MAX_EDGE, {
    fit: "inside",
    withoutEnlargement: true,
  });
  if (meta.hasAlpha) {
    p = p.flatten({ background: { r: 255, g: 255, b: 255 } });
  }
  await p.webp({ quality, effort: 6, smartSubsample: true }).toFile(tmp);
  return (await stat(tmp)).size;
}

/**
 * Каталог: всегда приводим к .webp после ресайза (читаемость ~ quality 86).
 */
async function processToWebp(file, dryRun) {
  const before = (await stat(file)).size;
  const ext = path.extname(file).toLowerCase();
  const stem = path.basename(file, ext);
  const dir = path.dirname(file);
  const outPath = path.join(dir, `${stem}.webp`);
  const tmp = outPath + ".tmp.webp";

  let after = await encodeWebpToTmp(file, 86, tmp);
  if (after > before * 1.15) {
    await unlink(tmp);
    after = await encodeWebpToTmp(file, 80, tmp);
  }

  const oldPublic = toPublicPath(file);
  const newPublic = toPublicPath(outPath);

  if (dryRun) {
    await unlink(tmp).catch(() => {});
    return {
      before,
      after,
      skipped: "dry-run",
      oldPublic,
      newPublic,
    };
  }

  if (path.resolve(file) === path.resolve(outPath)) {
    await unlink(outPath);
  }
  await rename(tmp, outPath);
  if (path.resolve(file) !== path.resolve(outPath)) {
    await unlink(file);
  }

  return {
    file: outPath,
    before,
    after,
    oldPublic: oldPublic !== newPublic ? oldPublic : null,
    newPublic,
  };
}

async function mainToWebp() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("→ DRY-RUN: файлы не пишем, патчи не применяем\n");

  const files = await walk(ROOT);
  console.log(`→ Режим --to-webp: файлов ${files.length}`);
  const mappings = [];
  let saved = 0;
  let errors = 0;

  for (const file of files) {
    try {
      const before = (await stat(file)).size;
      const r = await processToWebp(file, dryRun);

      if (dryRun) {
        const rel = path.relative(ROOT, file);
        const toName = path.basename(r.newPublic);
        console.log(
          r.oldPublic === r.newPublic
            ? `  would ${rel}  ${(before / 1024).toFixed(0)} → ~${(r.after / 1024).toFixed(0)} KiB`
            : `  would ${rel} → ${toName}  ${(before / 1024).toFixed(0)} → ~${(r.after / 1024).toFixed(0)} KiB`,
        );
        if (r.oldPublic !== r.newPublic) mappings.push([r.oldPublic, r.newPublic]);
        continue;
      }

      if (r.oldPublic) mappings.push([r.oldPublic, r.newPublic]);
      saved += before - r.after;
      const pct = ((1 - r.after / before) * 100).toFixed(1);
      const rel = path.relative(ROOT, file);
      const stemWebp = path.basename(r.newPublic);
      console.log(
        r.oldPublic
          ? `  ok ${rel} → ${stemWebp}  ${(before / 1024).toFixed(0)} → ${(r.after / 1024).toFixed(0)} KiB (−${pct}%)`
          : `  ok ${rel}  ${(before / 1024).toFixed(0)} → ${(r.after / 1024).toFixed(0)} KiB (−${pct}%)`,
      );
    } catch (e) {
      errors++;
      console.error(`  ERR ${path.relative(ROOT, file)}`, e.message);
      try {
        const stem = path.basename(file, path.extname(file));
        await unlink(path.join(path.dirname(file), `${stem}.webp.tmp.webp`)).catch(() => {});
      } catch {
        /* ignore */
      }
    }
  }

  if (!dryRun && mappings.length > 0) {
    await patchReferenceFiles(mappings);
  } else if (dryRun && mappings.length > 0) {
    console.log(`→ DRY-RUN: замен путей в TS/JSON: ${mappings.length}`);
  }

  console.log(`→ Сэкономлено (оценка): ${(saved / 1024 / 1024).toFixed(2)} MiB; ошибок: ${errors}`);
}

async function processFile(file, { recompressPng = false } = {}) {
  const before = (await stat(file)).size;
  const ext = path.extname(file).toLowerCase();
  const tmp = file + ".opt.tmp";

  const meta = await sharp(file).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const needsResize = w > MAX_EDGE || h > MAX_EDGE;

  if (!needsResize && ext === ".webp") {
    return { file, before, after: before, skipped: "no-resize-lossless" };
  }
  if (!needsResize && ext === ".png" && !recompressPng) {
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

async function mainLegacy() {
  const recompressPng = process.argv.includes("--recompress-png");
  if (recompressPng) {
    console.log("→ Режим --recompress-png: мелкие PNG тоже перекодируем (если выход меньше исходника).");
  }

  const files = await walk(ROOT);
  console.log(`→ Найдено файлов: ${files.length}`);
  let saved = 0;
  let skippedLarger = 0;
  let skippedNoResize = 0;
  let errors = 0;

  for (const file of files) {
    try {
      const r = await processFile(file, { recompressPng });
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

async function main() {
  if (process.argv.includes("--to-webp")) {
    await mainToWebp();
  } else {
    await mainLegacy();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
