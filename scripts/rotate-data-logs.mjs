import { promises as fs } from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const retentionDays = Number(process.env.DATA_LOG_RETENTION_DAYS || 180);
const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

const files = [
  "consent-events.ndjson",
  "orders.ndjson",
  "vin-requests.ndjson",
];

function keepLine(line) {
  if (!line.trim()) return false;
  try {
    const parsed = JSON.parse(line);
    const createdAt = Date.parse(String(parsed?.createdAt || ""));
    if (!Number.isFinite(createdAt)) return true;
    return createdAt >= cutoffMs;
  } catch {
    return true;
  }
}

async function rotateFile(fileName) {
  const fullPath = path.join(dataDir, fileName);
  try {
    const content = await fs.readFile(fullPath, "utf8");
    const kept = content
      .split("\n")
      .filter(keepLine)
      .join("\n")
      .trim();
    const next = kept ? kept + "\n" : "";
    await fs.writeFile(fullPath, next, "utf8");
    return { fileName, ok: true };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { fileName, ok: true };
    }
    return { fileName, ok: false, error: String(error) };
  }
}

await fs.mkdir(dataDir, { recursive: true });
const results = await Promise.all(files.map(rotateFile));
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error("Rotate failed:", failed);
  process.exit(1);
}
console.log(`Rotated logs. Retention: ${retentionDays} days.`);
