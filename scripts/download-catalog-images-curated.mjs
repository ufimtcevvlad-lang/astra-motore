#!/usr/bin/env node
/**
 * Скачивает фото с Wikimedia Commons: уникальные URL качаются один раз, затем копируются на все id.
 * Запуск: node scripts/download-catalog-images-curated.mjs
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "public", "images", "catalog");
const MANIFEST = path.join(OUT, "commons-sources.json");

const UA = "AstraMotorsCatalog/1.0 (curated Wikimedia download; astramotors.shop)";

/** Один URL → несколько id (одинаковое фото для похожих позиций витрины) */
const GROUPS = [
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Spark_plug_2.jpg/960px-Spark_plug_2.jpg",
    ids: ["opel-1"],
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Injector.jpg/960px-Injector.jpg",
    ids: ["opel-2"],
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/O-rings_%28toric_joints%29_with_tongue.jpg/960px-O-rings_%28toric_joints%29_with_tongue.jpg",
    ids: ["opel-3", "opel-5", "opel-6", "opel-19", "opel-20"],
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bosch_Oil_Filter.JPG/960px-Bosch_Oil_Filter.JPG",
    ids: ["opel-4"],
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Head_gasket.jpg/960px-Head_gasket.jpg",
    ids: ["opel-7", "opel-8", "opel-11", "opel-12", "opel-13", "opel-16"],
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Oil_filter.JPG/960px-Oil_filter.JPG",
    ids: ["opel-9"],
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Spark_plugs.jpg/960px-Spark_plugs.jpg",
    ids: ["opel-10"],
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/W5W_lamp.jpg/960px-W5W_lamp.jpg",
    ids: ["opel-14"],
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Caterham_Roadsport_building_-_141_-_Anti-roll_bar_link_bracket_LH_side_-_Flickr_-_exfordy.jpg/960px-Caterham_Roadsport_building_-_141_-_Anti-roll_bar_link_bracket_LH_side_-_Flickr_-_exfordy.jpg",
    ids: ["opel-15"],
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/7/71/02-sensor-vs-Voltage.jpg",
    ids: ["opel-17"],
  },
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Radiator_Cap_%282994245864%29.jpg/960px-Radiator_Cap_%282994245864%29.jpg",
    ids: ["opel-18"],
  },
];

function extFromUrl(u) {
  try {
    const p = new URL(u).pathname;
    const m = /\.(jpe?g|png|webp)$/i.exec(p);
    return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
  } catch {
    return "jpg";
  }
}

async function downloadOnce(url) {
  let lastErr;
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.status === 429) {
      const wait = 6000 + attempt * 4000;
      console.warn("429, ждём", wait / 1000, "с …");
      await new Promise((r) => setTimeout(r, wait));
      lastErr = new Error("429");
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }
  throw lastErr ?? new Error("429 после повторов");
}

await mkdir(OUT, { recursive: true });

const manifest = [];
const BETWEEN = 3500;

for (const g of GROUPS) {
  const ext = extFromUrl(g.url);
  const firstId = g.ids[0];
  const tmpName = `${firstId}.${ext}`;
  const tmpPath = path.join(OUT, tmpName);

  try {
    const buf = await downloadOnce(g.url);
    await writeFile(tmpPath, buf);
    console.log("OK download", tmpName, buf.length, "bytes →", g.ids.join(", "));

    for (const id of g.ids) {
      const fname = `${id}.${ext}`;
      const dest = path.join(OUT, fname);
      if (id !== firstId) {
        await copyFile(tmpPath, dest);
      }
      manifest.push({
        id,
        file: `/images/catalog/${fname}`,
        sourceUrl: g.url,
        status: "ok",
        bytes: buf.length,
      });
    }
  } catch (e) {
    console.error("FAIL", g.ids[0], e.message);
    for (const id of g.ids) {
      manifest.push({ id, sourceUrl: g.url, status: "error", error: e.message });
    }
  }

  await new Promise((r) => setTimeout(r, BETWEEN));
}

await writeFile(MANIFEST, JSON.stringify(manifest, null, 2), "utf8");
console.log("\nГотово. Манифест:", MANIFEST);
