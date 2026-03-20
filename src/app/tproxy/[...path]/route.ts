import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = new URL(request.url);

  const target = new URL(`https://telegram.org/${path.join("/")}`);
  target.search = url.search;

  const res = await fetch(target.toString(), {
    // В идеале пробрасывать user-agent, но для embed-ресурсов обычно не нужно
    redirect: "follow",
  });

  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const body = await res.arrayBuffer();

  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  });
}

