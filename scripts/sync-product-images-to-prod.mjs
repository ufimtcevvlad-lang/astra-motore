#!/usr/bin/env node
/**
 * Синхронизирует поля image/images из локальной shop.db в прод shop.db.
 *
 * Почему нужно: import-sorted-photos.mjs конвертирует фото в webp, кладёт в
 * public/images/catalog/<external_id>/ и обновляет ЛОКАЛЬНУЮ БД. Файлы доезжают
 * до прода через git push/deploy, но поля image/images на проде остаются '_pending' —
 * прод видит заглушку вместо галереи.
 *
 * Что делает:
 *  1. Читает локальный shop.db и достаёт пары (sku, external_id, image, images)
 *     для товаров с реальными фото (не _pending, не пустые).
 *  2. По SSH подключается к проду (5.42.117.221).
 *  3. Делает бэкап прод-БД рядом как shop.db.backup-YYYY-MM-DDTHH-MM-SS.
 *  4. Для каждой пары: проверяет что на проде лежат webp-файлы в
 *     public/images/catalog/<external_id>/. Если лежат — обновляет image/images.
 *     Если файлов нет — пропускает (не перетираем рабочую запись на битую).
 *
 * Запуск:
 *   node scripts/sync-product-images-to-prod.mjs --dry-run   # показать план
 *   node scripts/sync-product-images-to-prod.mjs --apply     # применить
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import Database from "better-sqlite3";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");
const LOCAL_DB = path.join(ROOT, "data", "shop.db");
const SSH_HOST = process.env.GM_SHOP_PROD_SSH || "root@5.42.117.221";
const PROD_ROOT = process.env.GM_SHOP_PROD_ROOT || "/var/www/astra-motors";
const PROD_DB = `${PROD_ROOT}/data/shop.db`;
const PROD_IMAGES_DIR = `${PROD_ROOT}/public/images/catalog`;

const APPLY = process.argv.includes("--apply");
const DRY = !APPLY;

function ssh(cmd) {
  // Цепочка `ls; ls; ls` возвращает exit-код последнего `ls`. Если
  // последняя папка отсутствует — exit=2, а execFileSync кидает ошибку,
  // теряя stdout. Игнорируем код, читаем stdout — про отсутствие папки
  // судим по пустому блоку в выводе, не по exit-коду.
  try {
    return execFileSync("ssh", ["-o", "ConnectTimeout=10", SSH_HOST, cmd], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (err) {
    if (err && typeof err.stdout === "string") return err.stdout;
    throw err;
  }
}

function main() {
  if (!fs.existsSync(LOCAL_DB)) {
    console.error(`Нет локальной БД: ${LOCAL_DB}`);
    process.exit(1);
  }

  const db = new Database(LOCAL_DB, { readonly: true });
  const rows = db
    .prepare(
      `SELECT sku, external_id, image, images FROM products
       WHERE image IS NOT NULL AND image != ''
         AND image NOT LIKE '%_pending%'
         AND images IS NOT NULL AND images != '[]'`
    )
    .all();
  db.close();

  console.log(`Локально: ${rows.length} товаров с реальными фото.`);

  // Проверяем что на проде есть файлы — одним SSH-запросом.
  const extIds = [...new Set(rows.map((r) => r.external_id))];
  const listCmd = extIds
    .map((id) => `echo "---${id}---"; ls "${PROD_IMAGES_DIR}/${id}/" 2>/dev/null`)
    .join("; ");
  const lsOut = ssh(listCmd);
  const haveFiles = new Set();
  let cur = null;
  for (const line of lsOut.split("\n")) {
    const m = line.match(/^---(.+)---$/);
    if (m) {
      cur = m[1];
      continue;
    }
    if (cur && /\.(webp|jpe?g|png)$/i.test(line.trim())) {
      haveFiles.add(cur);
    }
  }

  const ready = rows.filter((r) => haveFiles.has(r.external_id));
  const missing = rows.filter((r) => !haveFiles.has(r.external_id));

  console.log(`На проде файлы есть для: ${ready.length}`);
  console.log(`Пропущено (файлов нет на проде): ${missing.length}`);
  if (missing.length) {
    console.log("  Примеры:", missing.slice(0, 5).map((r) => r.sku).join(", "));
  }

  if (ready.length === 0) {
    console.log("Нечего применять.");
    return;
  }

  if (DRY) {
    console.log("\n[dry-run] Применится к первым 10 SKU:");
    ready.slice(0, 10).forEach((r) => {
      console.log(`  ${r.sku} (${r.external_id}) → ${r.image}`);
    });
    console.log("\nЗапустить с --apply чтобы применить.");
    return;
  }

  // Бэкап.
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backup = `${PROD_DB}.backup-${ts}`;
  ssh(`cp "${PROD_DB}" "${backup}"`);
  console.log(`Бэкап: ${backup}`);

  // Готовим SQL-батч. Экранируем одинарные кавычки.
  const esc = (s) => String(s).replace(/'/g, "''");
  const stmts = ready
    .map(
      (r) =>
        `UPDATE products SET image='${esc(r.image)}', images='${esc(
          r.images
        )}', updated_at='${new Date().toISOString()}' WHERE sku='${esc(r.sku)}';`
    )
    .join("\n");

  const tmpRemote = "/tmp/sync-images.sql";
  execFileSync("ssh", [SSH_HOST, `cat > ${tmpRemote}`], { input: stmts });
  ssh(`sqlite3 "${PROD_DB}" < ${tmpRemote} && rm ${tmpRemote}`);

  // Проверка.
  const checkOut = ssh(
    `sqlite3 "${PROD_DB}" "SELECT COUNT(*) FROM products WHERE image LIKE '%_pending%' OR images = '[]';"`
  );
  console.log(`После синка на проде с _pending/пустыми images: ${checkOut.trim()}`);
  console.log(`Обновлено: ${ready.length} товаров.`);
}

main();
