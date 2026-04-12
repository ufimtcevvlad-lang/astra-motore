import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getChatTokenFromCookie, verifyChatToken } from "@/app/lib/chat-auth";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const token = await getChatTokenFromCookie();
  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const verified = await verifyChatToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { conversationId } = verified;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Файл не загружен" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Недопустимый тип файла" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "Максимальный размер файла: 10MB" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const uploadDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "chat",
    String(conversationId)
  );

  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(path.join(uploadDir, filename), buffer);

  const url = `/uploads/chat/${conversationId}/${filename}`;
  return NextResponse.json({ url, originalName: file.name, size: file.size });
}
