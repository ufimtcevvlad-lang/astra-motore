import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function resolveUploadPath(filename: string): string | null {
  const safeName = path.basename(filename);
  if (safeName !== filename) return null;

  const ext = path.extname(safeName).toLowerCase();
  if (!CONTENT_TYPES[ext]) return null;

  return path.join(process.cwd(), "public", "uploads", "products", safeName);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const filePath = resolveUploadPath(filename);
  if (!filePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const file = await readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    return new NextResponse(file, {
      headers: {
        "Content-Type": CONTENT_TYPES[ext],
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
