#!/usr/bin/env node
/**
 * Импорт отсортированных парсером фото в каталог сайта (SQLite edition).
 *
 * Источник: ~/Pictures/сортивка/<SKU>/*.heic|jpg|png
 * Цель:     public/images/catalog/<external_id>/01.webp, 02.webp, ...
 *
 * Логика:
 *   1. Читаем данные из data/shop.db (таблица products).
 *   2. Для товаров у которых image пусто или содержит "_pending" —
 *      ищем папку сортивка/<sku>/.
 *   3. Если есть — конвертируем все фото в WebP (1600px / q86),
 *      кладём в public/images/catalog/<external_id>/ под именами 01.webp, 02.webp...
 *   4. Обновляем в БД поля image (первое фото) и images (JSON-массив).
 *
 * Товары с уже существующими фото (image НЕ пустой и НЕ "_pending") НЕ ТРОГАЕТ.
 *
 * Запуск:
 *   node scripts/import-sorted-photos.mjs --dry-run    (показать что будет сделано)
 *   node scripts/import-sorted-photos.mjs --apply      (реально применить)
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import Database from "better-sqlite3";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const DB_PATH = path.join(ROOT, "data/shop.db");
const MANIFEST_PATH = path.join(ROOT, "data/photo-manifest.json");
const CATALOG_DIR = path.join(ROOT, "public/images/catalog");
const WATERMARKED_DIR = path.join(ROOT, "public/images/watermarked");
const SORT_DIR = path.join(os.homedir(), "Pictures", "сортивка");
const PROD_WHITELIST_URL = process.env.GM_SHOP_WHITELIST_URL || "https://gmshop66.ru/api/internal/whitelist";
const SOURCE_EXT = /\.(heic|jpe?g|png|webp)$/i;
const MAX_EDGE = 1600;
const WEBP_QUALITY = 86;
const LIST_PREVIEW_LIMIT = 30;

const APPLY = process.argv.includes("--apply");
const DRY_RUN = !APPLY;

function log(...args) {
  console.log(...args);
}

function colorize(text, color) {
  const codes = { green: 32, yellow: 33, red: 31, cyan: 36, gray: 90 };
  return `\x1b[${codes[color] || 0}m${text}\x1b[0m`;
}

function isPending(imagePath) {
  if (!imagePath) return true;
  return imagePath.includes("_pending");
}

function hasRealImage(imagePath) {
  return !isPending(imagePath) && !imagePath.includes("placeholder-product");
}

function safeFolderName(sku) {
  return sku.replace(/[/\\]/g, "_");
}

function readFolderSku(dirPath, fallback) {
  const skuFile = path.join(dirPath, ".sku");
  if (!fs.existsSync(skuFile)) return fallback;
  const raw = fs.readFileSync(skuFile, "utf8").trim();
  return raw || fallback;
}

async function loadProdProducts() {
  try {
    const res = await fetch(PROD_WHITELIST_URL, {
      headers: { "User-Agent": "gmshop-photo-import/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = [...(data.gm ?? []), ...(data.nonGm ?? [])];
    return items
      .filter((p) => p?.sku && p?.externalId)
      .map((p) => ({
        id: null,
        external_id: p.externalId,
        sku: p.sku,
        image: p.image ?? "",
        images: "[]",
        source: "prod-whitelist",
      }));
  } catch (err) {
    log(colorize(`⚠️  Не удалось загрузить whitelist с прода: ${err.message}`, "yellow"));
    return [];
  }
}

function fileHash(filePath) {
  return crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");
}

function listSourcePhotos(dir) {
  if (!fs.existsSync(dir)) return { files: [], skippedDupes: [] };
  const all = fs
    .readdirSync(dir)
    .filter((f) => SOURCE_EXT.test(f) && !f.startsWith("."))
    .sort();

  const seen = new Map();
  const files = [];
  const skippedDupes = [];
  for (const f of all) {
    const hash = fileHash(path.join(dir, f));
    if (seen.has(hash)) {
      skippedDupes.push(`${f} (= ${seen.get(hash)})`);
    } else {
      seen.set(hash, f);
      files.push(f);
    }
  }
  return { files, skippedDupes };
}

function otsuThreshold(values) {
  const hist = new Array(256).fill(0);
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

async function readQrGuardSample(srcPath) {
  const ext = path.extname(srcPath).toLowerCase();
  let workPath = srcPath;
  let tmpJpeg = null;

  if (ext === ".heic") {
    tmpJpeg = path.join(os.tmpdir(), `qr-guard-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
    execFileSync("sips", ["-s", "format", "jpeg", "-Z", "900", srcPath, "--out", tmpJpeg], {
      stdio: "pipe",
    });
    workPath = tmpJpeg;
  }

  try {
    const { data, info } = await sharp(workPath)
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
  } finally {
    if (tmpJpeg && fs.existsSync(tmpJpeg)) fs.unlinkSync(tmpJpeg);
  }
}

function qrTransitionRate(bits, width, height, x, y, size) {
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

function qrSquareScore(sample, bits, x, y, size, threshold) {
  let dark = 0;
  let nearBlack = 0;
  let nearWhite = 0;
  let sum = 0;
  let sumSq = 0;

  for (let row = y; row < y + size; row++) {
    const offset = row * sample.width;
    for (let col = x; col < x + size; col++) {
      const value = sample.gray[offset + col];
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
  const transitions = qrTransitionRate(bits, sample.width, sample.height, x, y, size);

  if (darkRatio < 0.18 || darkRatio > 0.64) return 0;
  if (bwRatio < 0.5 || std < 48 || transitions < 0.17) return 0;
  return bwRatio * 0.35 + Math.min(std / 95, 1) * 0.25 + Math.min(transitions / 0.34, 1) * 0.4;
}

async function looksLikeQrSeparatorSource(srcPath) {
  try {
    const sample = await readQrGuardSample(srcPath);
    const minSide = Math.min(sample.width, sample.height);
    if (minSide < 120) return false;

    const threshold = otsuThreshold(sample.gray);
    const bits = new Uint8Array(sample.width * sample.height);
    for (let i = 0; i < sample.gray.length; i++) bits[i] = sample.gray[i] < threshold ? 1 : 0;

    for (const ratio of [0.32, 0.4, 0.5, 0.62, 0.74]) {
      const size = Math.max(96, Math.floor(minSide * ratio));
      const step = Math.max(16, Math.floor(size / 4));
      for (let y = 0; y <= sample.height - size; y += step) {
        for (let x = 0; x <= sample.width - size; x += step) {
          if (qrSquareScore(sample, bits, x, y, size, threshold) >= 0.78) return true;
        }
      }
    }
  } catch (err) {
    log(colorize(`⚠️  QR-защита не смогла проверить ${srcPath}: ${err.message}`, "yellow"));
  }
  return false;
}

async function convertToWebp(srcPath, outPath) {
  const ext = path.extname(srcPath).toLowerCase();
  let workPath = srcPath;
  let tmpJpeg = null;

  if (ext === ".heic") {
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

function runWatermarkGeneration() {
  log(colorize(`\n💧 Генерирую watermarked-версии фото…`, "cyan"));
  execFileSync(process.execPath, [path.join(ROOT, "scripts", "generate-watermarked-images.mjs")], {
    stdio: "inherit",
    cwd: ROOT,
  });
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    log(colorize(`Не нашёл ${DB_PATH}`, "red"));
    process.exit(1);
  }
  if (!fs.existsSync(SORT_DIR)) {
    log(colorize(`Не нашёл папку сортивки ${SORT_DIR}`, "red"));
    process.exit(1);
  }

  log(colorize(`\n📦 Импорт отсортированных фото → каталог (SQLite)`, "cyan"));
  log(colorize(`   Режим: ${DRY_RUN ? "DRY-RUN (без записи)" : "APPLY (запись)"}`, "gray"));
  log(colorize(`   Источник: ${SORT_DIR}`, "gray"));
  log(colorize(`   Цель: ${CATALOG_DIR}`, "gray"));
  log(colorize(`   БД: ${DB_PATH}\n`, "gray"));

  const db = new Database(DB_PATH, DRY_RUN ? { readonly: true, fileMustExist: true } : { fileMustExist: true });
  const localProducts = db
    .prepare("SELECT id, external_id, sku, image, images FROM products")
    .all()
    .map((p) => ({ ...p, source: "local-db" }));
  const prodProducts = await loadProdProducts();
  const bySku = new Map();
  for (const p of prodProducts) bySku.set(p.sku, p);
  for (const p of localProducts) bySku.set(p.sku, p);
  const products = [...bySku.values()];
  log(`Прочитано товаров: ${products.length}\n`);

  const plan = [];
  const skippedNoProduct = [];
  const sortDirs = fs
    .readdirSync(SORT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, "ru"));

  for (const dirName of sortDirs) {
    const sortedDir = path.join(SORT_DIR, dirName);
    const sku = readFolderSku(sortedDir, dirName);
    const p = bySku.get(sku) ?? products.find((candidate) => safeFolderName(candidate.sku) === dirName);
    const { files: sources, skippedDupes } = listSourcePhotos(sortedDir);
    if (sources.length === 0) continue;
    if (!p) {
      skippedNoProduct.push({ sku, dirName, sources: sources.length });
      continue;
    }
    if (hasRealImage(p.image)) {
      plan.push({ ...p, sources, skippedDupes, skippedQr: [], action: "skip-has-photo", sortedDir });
      continue;
    }

    const safeSources = [];
    const skippedQr = [];
    for (const source of sources) {
      const sourcePath = path.join(sortedDir, source);
      if (await looksLikeQrSeparatorSource(sourcePath)) {
        skippedQr.push(source);
      } else {
        safeSources.push(source);
      }
    }
    if (safeSources.length === 0) {
      if (skippedQr.length > 0) {
        log(colorize(`🚫 ${sku}: пропущены только QR-разделители (${skippedQr.join(", ")})`, "yellow"));
      }
      continue;
    }
    plan.push({ ...p, sources: safeSources, skippedDupes, skippedQr, action: "import", sortedDir });
  }

  const toImport = plan.filter((p) => p.action === "import");
  const toSkip = plan.filter((p) => p.action === "skip-has-photo");

  log(colorize(`✅ К импорту: ${toImport.length} товаров`, "green"));
  for (const p of toImport) {
    const dupeNote = p.skippedDupes.length > 0
      ? colorize(` (пропущено ${p.skippedDupes.length} дублей)`, "yellow")
      : "";
    log(`   ${colorize(p.sku, "cyan")} → ${p.external_id}  (${p.sources.length} фото${dupeNote})`);
    for (const d of p.skippedDupes) {
      log(colorize(`      ↳ дубль: ${d}`, "gray"));
    }
    for (const q of p.skippedQr) {
      log(colorize(`      ↳ QR-разделитель пропущен: ${q}`, "gray"));
    }
  }
  log("");
  log(colorize(`⏭  Пропускаем (фото уже есть на сайте): ${toSkip.length}`, "yellow"));
  for (const p of toSkip.slice(0, LIST_PREVIEW_LIMIT)) {
    log(colorize(`   ${p.sku} → ${p.external_id}  (есть ${p.sources.length} фото в сортивке, не трогаем)`, "gray"));
  }
  if (toSkip.length > LIST_PREVIEW_LIMIT) {
    log(colorize(`   …и ещё ${toSkip.length - LIST_PREVIEW_LIMIT} товаров с уже загруженными фото`, "gray"));
  }
  log("");

  if (skippedNoProduct.length > 0) {
    log(colorize(`❓ Не нашли товар под папку/артикул: ${skippedNoProduct.length}`, "yellow"));
    for (const p of skippedNoProduct) {
      log(colorize(`   ${p.dirName} → артикул ${p.sku} (${p.sources} фото)`, "gray"));
    }
    log("");
  }

  if (toImport.length === 0 && toSkip.length > 0) {
    log(colorize(`ℹ️  Фото в папке есть, но у этих товаров уже стоят фото на сайте. Парсер их специально не заменяет.`, "cyan"));
    log(colorize(`   Если нужно перезалить/заменить старые фото — нужен отдельный режим замены, чтобы случайно не стереть хорошее.`, "gray"));
    log("");
  }

  if (toImport.length === 0) {
    log("Нечего импортировать. Готово.");
    db.close();
    return;
  }

  if (DRY_RUN) {
    log(colorize(`Это DRY-RUN. Чтобы применить изменения — запусти:`, "yellow"));
    log(colorize(`   node scripts/import-sorted-photos.mjs --apply\n`, "yellow"));
    db.close();
    return;
  }

  log(colorize(`\n🔧 Применяю изменения…\n`, "cyan"));
  const now = new Date().toISOString();
  const updateStmt = db.prepare(
    "UPDATE products SET image = ?, images = ?, updated_at = ? WHERE id = ?",
  );
  const manifest = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"))
    : {};
  let okCount = 0;
  let failCount = 0;

  for (const p of toImport) {
    const targetDir = path.join(CATALOG_DIR, p.external_id);
    log(`${colorize(p.sku, "cyan")} → ${p.external_id}`);
    try {
      fs.mkdirSync(targetDir, { recursive: true });
      const newPaths = [];
      for (let i = 0; i < p.sources.length; i++) {
        const src = path.join(p.sortedDir, p.sources[i]);
        const num = String(i + 1).padStart(2, "0");
        const out = path.join(targetDir, `${num}.webp`);
        await convertToWebp(src, out);
        const sizeKb = (fs.statSync(out).size / 1024).toFixed(0);
        const webPath = `/images/catalog/${p.external_id}/${num}.webp`;
        newPaths.push(webPath);
        log(colorize(`   ✓ ${p.sources[i]} → ${num}.webp (${sizeKb} КБ)`, "gray"));
      }
      if (p.id != null) {
        updateStmt.run(newPaths[0], JSON.stringify(newPaths), now, p.id);
      }
      manifest[p.sku] = { image: newPaths[0], images: newPaths };
      okCount++;
    } catch (err) {
      log(colorize(`   ✗ ОШИБКА: ${err.message}`, "red"));
      failCount++;
    }
  }

  db.close();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  log(colorize(`📄 Манифест обновлён: ${MANIFEST_PATH}`, "gray"));
  log("");
  log(colorize(`🟢 Успех: ${okCount} товаров`, "green"));
  if (failCount > 0) log(colorize(`🔴 Ошибок: ${failCount}`, "red"));
  log(colorize(`\nБД обновлена. Проверь:`, "cyan"));
  log(colorize(`   git status public/images/catalog/`, "gray"));
  log(colorize(`   sqlite3 data/shop.db "SELECT sku, image FROM products WHERE updated_at = '${now}'"`, "gray"));

  if (okCount > 0) {
    try {
      runWatermarkGeneration();
    } catch (err) {
      log(colorize(`⚠️  Генерация водяных знаков упала: ${err.message}`, "yellow"));
      log(colorize(`   Запусти вручную: npm run catalog:watermark-images`, "gray"));
      return;
    }
  }

  // Полный цикл публикации на прод: git push (чтобы файлы уехали в репо) →
  // sync image/images в прод-БД (через SSH) → ssh rebuild + pm2 restart
  // (чтобы Next.js перечитал БД). Пропустить каждый из этапов — получить
  // "фото на сервере лежат, а карточки всё равно пустые" / "карточки обновились,
  // а картинка 404".
  if (okCount > 0 && (process.argv.includes("--apply") || process.argv.includes("--push-prod"))) {
    const SSH_HOST = process.env.GM_SHOP_PROD_SSH || "root@5.42.117.221";
    const PROD_ROOT = process.env.GM_SHOP_PROD_ROOT || "/var/www/astra-motors";
    const sh = (cmd, args, opts = {}) => {
      execFileSync(cmd, args, { stdio: "inherit", cwd: ROOT, ...opts });
    };

    const pushedUpdatedSkus = toImport.map((p) => p.sku);
    const committedPaths = [
      "data/photo-manifest.json",
      ...pushedUpdatedSkus.map((sku) => {
        const r = products.find((x) => x.sku === sku);
        return r ? `public/images/catalog/${r.external_id}` : null;
      }).filter(Boolean),
      ...pushedUpdatedSkus.flatMap((sku) => {
        const r = products.find((x) => x.sku === sku);
        if (!r) return [];
        return [
          path.relative(ROOT, path.join(WATERMARKED_DIR, "card/images/catalog", r.external_id)),
          path.relative(ROOT, path.join(WATERMARKED_DIR, "full/images/catalog", r.external_id)),
        ];
      }),
    ];

    try {
      log(colorize(`\n📦 git commit + push свежих фото…`, "cyan"));
      sh("git", ["add", "--", ...committedPaths]);
      // Если ничего нового (например, повторный запуск) — git commit упадёт.
      try {
        sh("git", ["commit", "-m", `photos: автоимпорт ${okCount} SKU`]);
        sh("git", ["push", "origin", "HEAD"]);
      } catch {
        log(colorize(`   (нет новых файлов для коммита — пропускаю push)`, "gray"));
      }
    } catch (err) {
      log(colorize(`⚠️  git push упал: ${err.message}. Прерываюсь — без push синк image/images на прод опередит доставку файлов.`, "yellow"));
      return;
    }

    try {
      log(colorize(`\n🔄 Синхронизирую image/images на прод…`, "cyan"));
      sh(process.execPath, [path.join(ROOT, "scripts", "sync-product-images-to-prod.mjs"), "--apply"]);
    } catch (err) {
      log(colorize(`⚠️  Синк на прод упал: ${err.message}`, "yellow"));
      log(colorize(`   Запусти вручную: node scripts/sync-product-images-to-prod.mjs --apply`, "gray"));
      return;
    }

    try {
      log(colorize(`\n🚀 Pull + rebuild + pm2 restart на VPS…`, "cyan"));
      execFileSync(
        "ssh",
        ["-o", "BatchMode=yes", "-o", "ConnectTimeout=15", SSH_HOST,
         `set -e; cd ${PROD_ROOT} && git pull --ff-only origin main && npx tsx scripts/apply-photo-manifest.ts && npm run build >/tmp/build.log 2>&1 && pm2 restart astra-motors >/dev/null && echo OK`],
        { stdio: "inherit" },
      );
    } catch (err) {
      log(colorize(`⚠️  Rebuild на проде упал: ${err.message}`, "yellow"));
      log(colorize(`   Файлы и БД уехали, но Next.js кэш старый. Зайди на VPS и сделай: cd ${PROD_ROOT} && git pull && npm run build && pm2 restart astra-motors`, "gray"));
    }
  }
}

main().catch((err) => {
  console.error(colorize(`FATAL: ${err.stack || err.message}`, "red"));
  process.exit(1);
});
