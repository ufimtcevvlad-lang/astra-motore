#!/usr/bin/env node
/**
 * Импорт отсортированных парсером фото в каталог сайта.
 *
 * Источник: ~/Pictures/сортивка/<SKU>/*.heic|jpg|png
 * Цель:     public/images/catalog/<product.id>/01.webp, 02.webp, ...
 *
 * Логика:
 *   1. Читаем src/app/data/products.ts, находим товары у которых
 *      image содержит "_pending" (то есть фото ещё нет).
 *   2. Для каждого такого товара ищем папку сортивка/<sku>/.
 *   3. Если есть — конвертируем все фото в WebP (1600px / q86),
 *      кладём в public/images/catalog/<product.id>/ под именами 01.webp, 02.webp...
 *   4. Патчим products.ts: заменяем image на первый файл,
 *      добавляем images: [...] если фото больше одного.
 *
 * Товары с уже существующими фото (image НЕ содержит "_pending") НЕ ТРОГАЕТ.
 *
 * Запуск:
 *   node scripts/import-sorted-photos.mjs --dry-run    (показать что будет сделано)
 *   node scripts/import-sorted-photos.mjs --apply      (реально применить)
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const PRODUCTS_TS = path.join(ROOT, "src/app/data/products.ts");
const CATALOG_DIR = path.join(ROOT, "public/images/catalog");
const SORT_DIR = path.join(os.homedir(), "Pictures", "сортивка");
const SOURCE_EXT = /\.(heic|jpe?g|png|webp)$/i;
const MAX_EDGE = 1600;
const WEBP_QUALITY = 86;

const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY;

function log(...args) {
  console.log(...args);
}

function colorize(text, color) {
  const codes = { green: 32, yellow: 33, red: 31, cyan: 36, gray: 90 };
  return `\x1b[${codes[color] || 0}m${text}\x1b[0m`;
}

/** Парсит products.ts и возвращает массив { id, sku, image, blockStart, blockEnd } */
function parseProducts(ts) {
  const products = [];
  // Ищем блоки товаров: каждый начинается с "id:" и содержит sku и image.
  // Используем простой стейт-машинный подход: ищем "id: \"...\"" → потом следующие sku и image.
  const idRegex = /id:\s*"([^"]+)"/g;
  let match;
  const idPositions = [];
  while ((match = idRegex.exec(ts)) !== null) {
    idPositions.push({ id: match[1], start: match.index });
  }
  for (let i = 0; i < idPositions.length; i++) {
    const blockStart = idPositions[i].start;
    const blockEnd = i + 1 < idPositions.length ? idPositions[i + 1].start : ts.length;
    const slice = ts.slice(blockStart, blockEnd);
    const skuMatch = slice.match(/sku:\s*"([^"]+)"/);
    const imageMatch = slice.match(/image:\s*"([^"]+)"/);
    if (!skuMatch || !imageMatch) continue;
    products.push({
      id: idPositions[i].id,
      sku: skuMatch[1],
      image: imageMatch[1],
      blockStart,
      blockEnd,
    });
  }
  return products;
}

function isPending(imagePath) {
  return imagePath.includes("_pending");
}

function listSourcePhotos(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => SOURCE_EXT.test(f) && !f.startsWith("."))
    .sort(); // имена уже с префиксом порядка съёмки
}

/** Конвертирует один файл в WebP. HEIC обрабатываем через sips → JPEG → sharp */
async function convertToWebp(srcPath, outPath) {
  const ext = path.extname(srcPath).toLowerCase();
  let workPath = srcPath;
  let tmpJpeg = null;

  if (ext === ".heic") {
    // sharp может уметь HEIC, но надёжнее через sips
    tmpJpeg = path.join(os.tmpdir(), `import-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
    try {
      execFileSync("sips", ["-s", "format", "jpeg", "-Z", String(MAX_EDGE), srcPath, "--out", tmpJpeg], {
        stdio: "pipe",
      });
      workPath = tmpJpeg;
    } catch (err) {
      if (tmpJpeg && fs.existsSync(tmpJpeg)) fs.unlinkSync(tmpJpeg);
      throw new Error(`sips failed for ${srcPath}: ${err.message}`);
    }
  }

  try {
    await sharp(workPath)
      .rotate()
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
      .toFile(outPath);
  } finally {
    if (tmpJpeg && fs.existsSync(tmpJpeg)) fs.unlinkSync(tmpJpeg);
  }
}

/** Патч одной записи в products.ts: заменить image и опционально вставить images */
function patchProductBlock(ts, product, newImage, newImages) {
  // newImages — массив всех путей включая newImage; если только один — images не нужен.
  const before = ts.slice(0, product.blockStart);
  const after = ts.slice(product.blockEnd);
  let block = ts.slice(product.blockStart, product.blockEnd);

  // Заменяем image: "..."
  const oldImageRe = /image:\s*"[^"]*"/;
  if (!oldImageRe.test(block)) {
    throw new Error(`не нашёл image: в блоке ${product.id}`);
  }
  block = block.replace(oldImageRe, `image: "${newImage}"`);

  // Если есть несколько фото — добавляем images: [...] сразу после image:
  // (если уже есть images: — заменяем; для _pending товаров его обычно нет, но проверим)
  if (newImages.length > 1) {
    const imagesArrayLiteral = `[\n      ${newImages.map((p) => `"${p}"`).join(",\n      ")},\n    ]`;
    const existingImagesRe = /images:\s*\[[\s\S]*?\]/;
    if (existingImagesRe.test(block)) {
      block = block.replace(existingImagesRe, `images: ${imagesArrayLiteral}`);
    } else {
      // вставляем после image: "..." перед следующей запятой и переводом строки
      block = block.replace(
        /(image:\s*"[^"]*",)/,
        `$1\n    images: ${imagesArrayLiteral},`,
      );
    }
  }
  return before + block + after;
}

async function main() {
  if (!fs.existsSync(PRODUCTS_TS)) {
    log(colorize(`Не нашёл ${PRODUCTS_TS}`, "red"));
    process.exit(1);
  }
  if (!fs.existsSync(SORT_DIR)) {
    log(colorize(`Не нашёл папку сортивки ${SORT_DIR}`, "red"));
    process.exit(1);
  }

  log(colorize(`\n📦 Импорт отсортированных фото → каталог`, "cyan"));
  log(colorize(`   Режим: ${DRY_RUN ? "DRY-RUN (без записи)" : "APPLY (запись)"}`, "gray"));
  log(colorize(`   Источник: ${SORT_DIR}`, "gray"));
  log(colorize(`   Цель: ${CATALOG_DIR}`, "gray"));
  log(colorize(`   products.ts: ${PRODUCTS_TS}\n`, "gray"));

  let ts = fs.readFileSync(PRODUCTS_TS, "utf8");
  const products = parseProducts(ts);
  log(`Прочитано товаров: ${products.length}\n`);

  const plan = [];
  for (const p of products) {
    const sortedDir = path.join(SORT_DIR, p.sku);
    if (!fs.existsSync(sortedDir)) continue;
    const sources = listSourcePhotos(sortedDir);
    if (sources.length === 0) continue;
    if (!isPending(p.image)) {
      plan.push({ ...p, sources, action: "skip-has-photo", sortedDir });
      continue;
    }
    plan.push({ ...p, sources, action: "import", sortedDir });
  }

  const toImport = plan.filter((p) => p.action === "import");
  const toSkip = plan.filter((p) => p.action === "skip-has-photo");

  log(colorize(`✅ К импорту: ${toImport.length} товаров`, "green"));
  for (const p of toImport) {
    log(`   ${colorize(p.sku, "cyan")} → ${p.id}  (${p.sources.length} фото)`);
  }
  log("");
  log(colorize(`⏭  Пропускаем (фото уже есть на сайте): ${toSkip.length}`, "yellow"));
  for (const p of toSkip) {
    log(colorize(`   ${p.sku} → ${p.id}  (есть ${p.sources.length} фото в сортивке, не трогаем)`, "gray"));
  }
  log("");

  if (toImport.length === 0) {
    log("Нечего импортировать. Готово.");
    return;
  }

  if (DRY_RUN) {
    log(colorize(`Это DRY-RUN. Чтобы применить изменения — запусти:`, "yellow"));
    log(colorize(`   node scripts/import-sorted-photos.mjs --apply\n`, "yellow"));
    return;
  }

  // APPLY режим
  log(colorize(`\n🔧 Применяю изменения…\n`, "cyan"));
  let updatedTs = ts;
  let okCount = 0;
  let failCount = 0;

  for (const p of toImport) {
    const targetDir = path.join(CATALOG_DIR, p.id);
    log(`${colorize(p.sku, "cyan")} → ${p.id}`);
    try {
      fs.mkdirSync(targetDir, { recursive: true });
      const newPaths = [];
      for (let i = 0; i < p.sources.length; i++) {
        const src = path.join(p.sortedDir, p.sources[i]);
        const num = String(i + 1).padStart(2, "0");
        const out = path.join(targetDir, `${num}.webp`);
        await convertToWebp(src, out);
        const sizeKb = (fs.statSync(out).size / 1024).toFixed(0);
        const webPath = `/images/catalog/${p.id}/${num}.webp`;
        newPaths.push(webPath);
        log(colorize(`   ✓ ${p.sources[i]} → ${num}.webp (${sizeKb} КБ)`, "gray"));
      }
      // Re-parse to get fresh blockStart/blockEnd after previous patches
      const fresh = parseProducts(updatedTs).find((x) => x.id === p.id);
      if (!fresh) throw new Error(`товар ${p.id} пропал после re-parse`);
      updatedTs = patchProductBlock(updatedTs, fresh, newPaths[0], newPaths);
      okCount++;
    } catch (err) {
      log(colorize(`   ✗ ОШИБКА: ${err.message}`, "red"));
      failCount++;
    }
  }

  fs.writeFileSync(PRODUCTS_TS, updatedTs, "utf8");
  log("");
  log(colorize(`🟢 Успех: ${okCount} товаров`, "green"));
  if (failCount > 0) log(colorize(`🔴 Ошибок: ${failCount}`, "red"));
  log(colorize(`\nproducts.ts обновлён. Проверь diff:`, "cyan"));
  log(colorize(`   git diff src/app/data/products.ts`, "gray"));
  log(colorize(`   git status public/images/catalog/`, "gray"));
}

main().catch((err) => {
  console.error(colorize(`FATAL: ${err.stack || err.message}`, "red"));
  process.exit(1);
});
