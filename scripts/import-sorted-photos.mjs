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
  execFileSync("node", [path.join(ROOT, "scripts", "generate-watermarked-images.mjs")], {
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

  const db = new Database(DB_PATH);
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
      plan.push({ ...p, sources, skippedDupes, action: "skip-has-photo", sortedDir });
      continue;
    }
    plan.push({ ...p, sources, skippedDupes, action: "import", sortedDir });
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
  }
  log("");
  log(colorize(`⏭  Пропускаем (фото уже есть на сайте): ${toSkip.length}`, "yellow"));
  for (const p of toSkip) {
    log(colorize(`   ${p.sku} → ${p.external_id}  (есть ${p.sources.length} фото в сортивке, не трогаем)`, "gray"));
  }
  log("");

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
      sh("node", [path.join(ROOT, "scripts", "sync-product-images-to-prod.mjs"), "--apply"]);
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
