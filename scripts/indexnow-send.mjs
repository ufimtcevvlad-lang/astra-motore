import fs from "node:fs";
import path from "node:path";

const KEY = "gmshop66-indexnow-20260403";
const HOST = "gmshop66.ru";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const siteUrl = `https://${HOST}`;

function readProductsIds() {
  // продукты лежат как TS-модуль, но в проекте небольшой ассортимент.
  // Для простоты: парсим строкой id: "..."
  const productsPath = path.join(process.cwd(), "src", "app", "data", "products.ts");
  const raw = fs.readFileSync(productsPath, "utf8");
  const ids = new Set();
  const re = /id:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    ids.add(m[1]);
  }
  return Array.from(ids).sort((a, b) => Number(a) - Number(b));
}

async function main() {
  const ids = readProductsIds();

  const urlList = [
    siteUrl,
    `${siteUrl}/catalog`,
    `${siteUrl}/contacts`,
    `${siteUrl}/how-to-order`,
    `${siteUrl}/zapchasti-gm`,
    `${siteUrl}/zapchasti-opel`,
    `${siteUrl}/zapchasti-chevrolet`,
    ...ids.map((id) => `${siteUrl}/product/${id}`),
  ];

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  };

  const res = await fetch("https://yandex.com/indexnow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`IndexNow error ${res.status}: ${text}`);
  }

  // Ответ обычно короткий (часто "ok"), оставим как есть.
  console.log(text || "ok");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

