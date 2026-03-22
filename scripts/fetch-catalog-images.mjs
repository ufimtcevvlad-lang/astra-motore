#!/usr/bin/env node
/**
 * @deprecated Используйте `npm run catalog:images` → `download-catalog-images-curated.mjs`
 * (отдельный файл на каждую позицию opel-1 … opel-20).
 * Скачивает фото пилотного каталога с Wikimedia Commons (нужен корректный User-Agent).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "images", "catalog");

const UA = "AstraMotorsBot/1.0 (https://astramotors.shop; catalog image sync)";

const FILES = [
  ["opel-1.jpg", "https://upload.wikimedia.org/wikipedia/commons/7/7c/Spark_plug_2.jpg"],
  ["opel-2.jpg", "https://upload.wikimedia.org/wikipedia/commons/5/5c/Injector.jpg"],
  [
    "opel-3456-rings.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/1/10/O-rings_%28toric_joints%29_with_tongue.jpg",
  ],
  ["opel-78-rings.jpg", "https://upload.wikimedia.org/wikipedia/commons/d/d4/Head_gasket.jpg"],
  ["opel-4.jpg", "https://upload.wikimedia.org/wikipedia/commons/5/52/Bosch_Oil_Filter.JPG"],
  ["opel-9.jpg", "https://upload.wikimedia.org/wikipedia/commons/2/23/Oil_filter.JPG"],
  ["opel-10.jpg", "https://upload.wikimedia.org/wikipedia/commons/1/10/Spark_plugs.jpg"],
];

async function download(name, url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${name}: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(OUT, name), buf);
  console.log("OK", name, buf.length, "bytes");
}

await mkdir(OUT, { recursive: true });
for (const [name, url] of FILES) {
  await download(name, url);
  await new Promise((r) => setTimeout(r, 800));
}
console.log("Done →", OUT);
