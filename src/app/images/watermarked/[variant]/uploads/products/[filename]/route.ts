import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VARIANTS = new Set(["card", "full"]);

function resolveWatermarkedPath(variant: string, filename: string): string | null {
  if (!VARIANTS.has(variant)) return null;

  const safeName = path.basename(filename);
  if (safeName !== filename || path.extname(safeName).toLowerCase() !== ".webp") return null;

  return path.join(
    process.cwd(),
    "public",
    "images",
    "watermarked",
    variant,
    "uploads",
    "products",
    safeName,
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ variant: string; filename: string }> },
) {
  const { variant, filename } = await params;
  const filePath = resolveWatermarkedPath(variant, filename);
  if (!filePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const file = await readFile(filePath);
    return new NextResponse(file, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
