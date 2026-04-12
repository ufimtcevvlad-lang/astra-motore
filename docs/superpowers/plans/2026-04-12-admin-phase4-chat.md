# Phase 4: Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time chat system with a customer-facing widget on the storefront and a unified inbox in the admin panel, with notifications via Web Push, Telegram, and browser sound.

**Architecture:** Monolith in Next.js — client chat widget as React component in root layout, admin inbox as two-panel page at `/admin/conversations`, polling every 3s for updates. File uploads to `public/uploads/chat/`. Web Push via `web-push` npm package, Telegram notifications via existing bot.

**Tech Stack:** Next.js 16, React 19, SQLite (Drizzle ORM), Tailwind CSS 4, `web-push`, `crypto.randomUUID` for tokens.

**Spec:** `docs/superpowers/specs/2026-04-12-admin-phase4-chat.md`

---

## File Structure

### New files

**Schema & migration:**
- `src/app/lib/db/schema.ts` — modify: add `assignedAdminId`, `lastMessageAt`, `unreadCount` to conversations; add `readAt` to messages; add `chatTokens` and `pushSubscriptions` tables

**Chat token utility:**
- `src/app/lib/chat-auth.ts` — create/verify chat tokens, cookie handling

**Client chat API:**
- `src/app/api/chat/start/route.ts` — POST: start conversation
- `src/app/api/chat/messages/route.ts` — GET: poll messages
- `src/app/api/chat/send/route.ts` — POST: send message
- `src/app/api/chat/upload/route.ts` — POST: upload file

**Admin conversations API:**
- `src/app/api/admin/conversations/route.ts` — GET: list conversations
- `src/app/api/admin/conversations/[id]/route.ts` — GET: single conversation + messages
- `src/app/api/admin/conversations/[id]/send/route.ts` — POST: send message/note
- `src/app/api/admin/conversations/[id]/assign/route.ts` — PUT: assign admin
- `src/app/api/admin/conversations/[id]/read/route.ts` — PUT: mark read
- `src/app/api/admin/conversations/unread-count/route.ts` — GET: badge count

**Admin quick replies API:**
- `src/app/api/admin/quick-replies/route.ts` — GET/POST
- `src/app/api/admin/quick-replies/[id]/route.ts` — PUT/DELETE

**Admin file upload:**
- `src/app/api/admin/conversations/upload/route.ts` — POST: upload file

**Admin UI pages:**
- `src/app/admin/(app)/conversations/page.tsx` — inbox page
- `src/app/admin/(app)/settings/quick-replies/page.tsx` — quick replies CRUD

**Admin UI components:**
- `src/app/admin/components/ConversationList.tsx` — left panel: list of dialogs
- `src/app/admin/components/ConversationChat.tsx` — center panel: message thread
- `src/app/admin/components/ConversationInfo.tsx` — right panel: customer info
- `src/app/admin/components/QuickRepliesPicker.tsx` — dropdown in chat input
- `src/app/admin/components/QuickRepliesManager.tsx` — settings CRUD

**Chat widget:**
- `src/app/components/ChatWidget.tsx` — floating bubble + chat window
- `src/app/components/ChatStartForm.tsx` — name/contact mini-form

**Notifications:**
- `src/app/lib/notifications.ts` — Web Push + Telegram send helpers
- `public/sw-push.js` — Service Worker for push notifications

### Modified files
- `src/app/lib/db/schema.ts` — add new columns and tables
- `src/app/layout.tsx` — add `<ChatWidget />` component
- `src/app/admin/components/AdminSidebar.tsx` — add unread badge to chat nav item
- `src/app/admin/(app)/layout.tsx` — add unread count polling context

---

## Task 1: Schema Migration

**Files:**
- Modify: `src/app/lib/db/schema.ts`
- Create: new Drizzle migration via `npx drizzle-kit generate`

- [ ] **Step 1: Add new columns to conversations table**

In `src/app/lib/db/schema.ts`, add to the `conversations` table definition:

```typescript
assignedAdminId: integer("assigned_admin_id").references(() => admins.id),
lastMessageAt: text("last_message_at").notNull().default(""),
unreadCount: integer("unread_count").notNull().default(0),
```

- [ ] **Step 2: Add readAt column to messages table**

In `src/app/lib/db/schema.ts`, add to the `messages` table definition:

```typescript
readAt: text("read_at"),
```

- [ ] **Step 3: Add chatTokens table**

In `src/app/lib/db/schema.ts`, add after the existing tables:

```typescript
export const chatTokens = sqliteTable("chat_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});
```

- [ ] **Step 4: Add pushSubscriptions table**

In `src/app/lib/db/schema.ts`, add:

```typescript
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminId: integer("admin_id")
    .notNull()
    .references(() => admins.id),
  endpoint: text("endpoint").notNull(),
  keysJson: text("keys_json").notNull(),
  createdAt: text("created_at").notNull(),
});
```

- [ ] **Step 5: Generate and run migration**

```bash
npx drizzle-kit generate
```

Verify a new migration file appears in `drizzle/` directory with ALTER TABLE statements.

- [ ] **Step 6: Test migration locally**

```bash
npm run build
```

Expected: build succeeds, no schema errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/lib/db/schema.ts drizzle/
git commit -m "feat(chat): add schema for chat tokens, push subscriptions, new conversation fields"
```

---

## Task 2: Chat Auth Utility

**Files:**
- Create: `src/app/lib/chat-auth.ts`

- [ ] **Step 1: Create chat-auth.ts**

```typescript
import { db, schema } from "@/app/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";

const CHAT_TOKEN_COOKIE = "chat_token";
const TOKEN_TTL_DAYS = 30;

export function generateToken(): string {
  return crypto.randomUUID() + "-" + crypto.randomUUID();
}

export function createChatToken(conversationId: number): string {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  db.insert(schema.chatTokens)
    .values({
      conversationId,
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
    })
    .run();

  return token;
}

export function verifyChatToken(token: string): { conversationId: number } | null {
  const now = new Date().toISOString();

  const [row] = db
    .select({ conversationId: schema.chatTokens.conversationId })
    .from(schema.chatTokens)
    .where(
      and(
        eq(schema.chatTokens.token, token),
        gt(schema.chatTokens.expiresAt, now)
      )
    )
    .all();

  return row ?? null;
}

export async function getChatTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CHAT_TOKEN_COOKIE)?.value ?? null;
}

export async function setChatTokenCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CHAT_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/lib/chat-auth.ts
git commit -m "feat(chat): add chat token auth utility"
```

---

## Task 3: Client Chat API — Start Conversation

**Files:**
- Create: `src/app/api/chat/start/route.ts`

- [ ] **Step 1: Create start endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/app/lib/db";
import {
  createChatToken,
  setChatTokenCookie,
  getChatTokenFromCookie,
  verifyChatToken,
} from "@/app/lib/chat-auth";

export async function POST(req: NextRequest) {
  // Check if already has active conversation
  const existingToken = await getChatTokenFromCookie();
  if (existingToken) {
    const verified = verifyChatToken(existingToken);
    if (verified) {
      return NextResponse.json({
        conversationId: verified.conversationId,
        resumed: true,
      });
    }
  }

  const body = await req.json();
  const { name, contact } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Имя обязательно" }, { status: 400 });
  }
  if (!contact?.trim()) {
    return NextResponse.json(
      { error: "Телефон или email обязателен" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const result = db
    .insert(schema.conversations)
    .values({
      channel: "chat",
      customerName: name.trim(),
      customerContact: contact.trim(),
      status: "new",
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      unreadCount: 0,
    })
    .run();

  const conversationId = Number(result.lastInsertRowid);
  const token = createChatToken(conversationId);
  await setChatTokenCookie(token);

  return NextResponse.json({ conversationId, resumed: false });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/chat/start/route.ts
git commit -m "feat(chat): add POST /api/chat/start endpoint"
```

---

## Task 4: Client Chat API — Send & Poll Messages

**Files:**
- Create: `src/app/api/chat/send/route.ts`
- Create: `src/app/api/chat/messages/route.ts`

- [ ] **Step 1: Create send endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";
import { getChatTokenFromCookie, verifyChatToken } from "@/app/lib/chat-auth";
import { notifyAdminsNewMessage } from "@/app/lib/notifications";

export async function POST(req: NextRequest) {
  const token = await getChatTokenFromCookie();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const verified = verifyChatToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  const body = await req.json();
  const { text, attachments } = body;

  if (!text?.trim() && (!attachments || attachments.length === 0)) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  const now = new Date().toISOString();

  db.insert(schema.messages)
    .values({
      conversationId: verified.conversationId,
      sender: "customer",
      text: text?.trim() ?? "",
      attachments: JSON.stringify(attachments ?? []),
      isInternalNote: false,
      createdAt: now,
    })
    .run();

  // Update conversation
  db.update(schema.conversations)
    .set({
      lastMessageAt: now,
      updatedAt: now,
      unreadCount: db
        .select({ count: schema.conversations.unreadCount })
        .from(schema.conversations)
        .where(eq(schema.conversations.id, verified.conversationId))
        .get()!.count + 1,
      status: "new",
    })
    .where(eq(schema.conversations.id, verified.conversationId))
    .run();

  // Fire-and-forget notifications
  notifyAdminsNewMessage(verified.conversationId, text?.trim() ?? "[файл]").catch(
    () => {}
  );

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create messages polling endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/app/lib/db";
import { eq, and, gt } from "drizzle-orm";
import { getChatTokenFromCookie, verifyChatToken } from "@/app/lib/chat-auth";

export async function GET(req: NextRequest) {
  const token = await getChatTokenFromCookie();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const verified = verifyChatToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  const after = req.nextUrl.searchParams.get("after") ?? "";

  const conditions = [
    eq(schema.messages.conversationId, verified.conversationId),
    eq(schema.messages.isInternalNote, false), // hide internal notes from customer
  ];

  if (after) {
    conditions.push(gt(schema.messages.id, Number(after)));
  }

  const messages = db
    .select({
      id: schema.messages.id,
      sender: schema.messages.sender,
      text: schema.messages.text,
      attachments: schema.messages.attachments,
      createdAt: schema.messages.createdAt,
    })
    .from(schema.messages)
    .where(and(...conditions))
    .orderBy(schema.messages.id)
    .all();

  return NextResponse.json({
    messages: messages.map((m) => ({
      ...m,
      attachments: JSON.parse(m.attachments),
    })),
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat/send/route.ts src/app/api/chat/messages/route.ts
git commit -m "feat(chat): add client send and poll messages endpoints"
```

---

## Task 5: File Upload Routes

**Files:**
- Create: `src/app/api/chat/upload/route.ts`
- Create: `src/app/api/admin/conversations/upload/route.ts`

- [ ] **Step 1: Create client upload endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getChatTokenFromCookie, verifyChatToken } from "@/app/lib/chat-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const verified = verifyChatToken(token);
  if (!verified) {
    return NextResponse.json({ error: "Token expired" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Файл не загружен" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Недопустимый формат файла" },
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
    String(verified.conversationId)
  );

  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));

  const url = `/uploads/chat/${verified.conversationId}/${filename}`;
  return NextResponse.json({ url, originalName: file.name, size: file.size });
}
```

- [ ] **Step 2: Create admin upload endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

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
const MAX_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const conversationId = formData.get("conversationId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "Файл не загружен" }, { status: 400 });
  }

  if (!conversationId) {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Недопустимый формат файла" },
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
    conversationId
  );

  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, filename), Buffer.from(bytes));

  const url = `/uploads/chat/${conversationId}/${filename}`;
  return NextResponse.json({ url, originalName: file.name, size: file.size });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat/upload/route.ts src/app/api/admin/conversations/upload/route.ts
git commit -m "feat(chat): add file upload endpoints for client and admin"
```

---

## Task 6: Admin Conversations API — List & Unread Count

**Files:**
- Create: `src/app/api/admin/conversations/route.ts`
- Create: `src/app/api/admin/conversations/unread-count/route.ts`

- [ ] **Step 1: Create conversations list endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, like, desc, sql, and, gt, or } from "drizzle-orm";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const filter = url.searchParams.get("filter") ?? "all"; // "all" | "unread"
  const search = url.searchParams.get("search")?.trim() || null;
  const assignedTo = url.searchParams.get("assignedTo") || null;

  const conditions = [];

  if (filter === "unread") {
    conditions.push(gt(schema.conversations.unreadCount, 0));
  }

  if (search) {
    conditions.push(
      or(
        like(schema.conversations.customerName, `%${search}%`),
        like(schema.conversations.customerContact, `%${search}%`)
      )
    );
  }

  if (assignedTo) {
    conditions.push(eq(schema.conversations.assignedAdminId, Number(assignedTo)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.conversations)
    .where(where)
    .all();

  const total = Number(countResult.count);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const offset = (page - 1) * PAGE_SIZE;

  // Get unread count for badge
  const [unreadResult] = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.conversations)
    .where(gt(schema.conversations.unreadCount, 0))
    .all();

  const conversations = db
    .select({
      id: schema.conversations.id,
      channel: schema.conversations.channel,
      customerName: schema.conversations.customerName,
      customerContact: schema.conversations.customerContact,
      status: schema.conversations.status,
      unreadCount: schema.conversations.unreadCount,
      assignedAdminId: schema.conversations.assignedAdminId,
      lastMessageAt: schema.conversations.lastMessageAt,
      createdAt: schema.conversations.createdAt,
    })
    .from(schema.conversations)
    .where(where)
    .orderBy(desc(schema.conversations.lastMessageAt))
    .limit(PAGE_SIZE)
    .offset(offset)
    .all();

  // Get last message preview for each conversation
  const withPreviews = conversations.map((conv) => {
    const [lastMsg] = db
      .select({
        text: schema.messages.text,
        sender: schema.messages.sender,
        createdAt: schema.messages.createdAt,
      })
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.conversationId, conv.id),
          eq(schema.messages.isInternalNote, false)
        )
      )
      .orderBy(desc(schema.messages.id))
      .limit(1)
      .all();

    return {
      ...conv,
      lastMessage: lastMsg ?? null,
    };
  });

  return NextResponse.json({
    conversations: withPreviews,
    total,
    page,
    totalPages,
    totalUnread: Number(unreadResult.count),
  });
}
```

- [ ] **Step 2: Create unread count endpoint**

```typescript
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { gt, sql } from "drizzle-orm";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const [result] = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.conversations)
    .where(gt(schema.conversations.unreadCount, 0))
    .all();

  return NextResponse.json({ unreadCount: Number(result.count) });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/conversations/route.ts src/app/api/admin/conversations/unread-count/route.ts
git commit -m "feat(chat): add admin conversations list and unread count API"
```

---

## Task 7: Admin Conversations API — Detail, Send, Assign, Read

**Files:**
- Create: `src/app/api/admin/conversations/[id]/route.ts`
- Create: `src/app/api/admin/conversations/[id]/send/route.ts`
- Create: `src/app/api/admin/conversations/[id]/assign/route.ts`
- Create: `src/app/api/admin/conversations/[id]/read/route.ts`

- [ ] **Step 1: Create conversation detail endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const convId = Number(id);

  const [conversation] = db
    .select()
    .from(schema.conversations)
    .where(eq(schema.conversations.id, convId))
    .all();

  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = db
    .select({
      id: schema.messages.id,
      sender: schema.messages.sender,
      adminId: schema.messages.adminId,
      text: schema.messages.text,
      attachments: schema.messages.attachments,
      isInternalNote: schema.messages.isInternalNote,
      createdAt: schema.messages.createdAt,
      readAt: schema.messages.readAt,
    })
    .from(schema.messages)
    .where(eq(schema.messages.conversationId, convId))
    .orderBy(schema.messages.id)
    .all();

  // Get assigned admin name
  let assignedAdmin = null;
  if (conversation.assignedAdminId) {
    const [admin] = db
      .select({ id: schema.admins.id, name: schema.admins.name })
      .from(schema.admins)
      .where(eq(schema.admins.id, conversation.assignedAdminId))
      .all();
    assignedAdmin = admin ?? null;
  }

  // Get all admins for assignment dropdown
  const admins = db
    .select({ id: schema.admins.id, name: schema.admins.name })
    .from(schema.admins)
    .all();

  return NextResponse.json({
    conversation,
    messages: messages.map((m) => ({
      ...m,
      attachments: JSON.parse(m.attachments),
    })),
    assignedAdmin,
    admins,
  });
}
```

- [ ] **Step 2: Create send message endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const convId = Number(id);
  const body = await req.json();
  const { text, attachments, isInternalNote } = body;

  if (!text?.trim() && (!attachments || attachments.length === 0)) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  const now = new Date().toISOString();

  db.insert(schema.messages)
    .values({
      conversationId: convId,
      sender: "admin",
      adminId: auth.admin.id,
      text: text?.trim() ?? "",
      attachments: JSON.stringify(attachments ?? []),
      isInternalNote: isInternalNote ?? false,
      createdAt: now,
    })
    .run();

  // Update conversation timestamp (don't reset unread — that's for customer messages)
  db.update(schema.conversations)
    .set({
      lastMessageAt: now,
      updatedAt: now,
    })
    .where(eq(schema.conversations.id, convId))
    .run();

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create assign endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const convId = Number(id);
  const body = await req.json();

  db.update(schema.conversations)
    .set({
      assignedAdminId: body.adminId ?? null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(schema.conversations.id, convId))
    .run();

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Create mark-read endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, and, isNull } from "drizzle-orm";

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const convId = Number(id);
  const now = new Date().toISOString();

  // Mark all unread messages as read
  db.update(schema.messages)
    .set({ readAt: now })
    .where(
      and(
        eq(schema.messages.conversationId, convId),
        eq(schema.messages.sender, "customer"),
        isNull(schema.messages.readAt)
      )
    )
    .run();

  // Reset unread count
  db.update(schema.conversations)
    .set({ unreadCount: 0, updatedAt: now })
    .where(eq(schema.conversations.id, convId))
    .run();

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/conversations/\[id\]/
git commit -m "feat(chat): add admin conversation detail, send, assign, mark-read APIs"
```

---

## Task 8: Admin Quick Replies API

**Files:**
- Create: `src/app/api/admin/quick-replies/route.ts`
- Create: `src/app/api/admin/quick-replies/[id]/route.ts`

- [ ] **Step 1: Create list + create endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const replies = db
    .select()
    .from(schema.quickReplies)
    .orderBy(schema.quickReplies.sortOrder)
    .all();

  return NextResponse.json({ replies });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const { title, text } = body;

  if (!title?.trim() || !text?.trim()) {
    return NextResponse.json(
      { error: "Заголовок и текст обязательны" },
      { status: 400 }
    );
  }

  const result = db
    .insert(schema.quickReplies)
    .values({
      title: title.trim(),
      text: text.trim(),
      sortOrder: 0,
    })
    .run();

  return NextResponse.json({ id: Number(result.lastInsertRowid) });
}
```

- [ ] **Step 2: Create update + delete endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.text !== undefined) updates.text = body.text.trim();
  if (body.sortOrder !== undefined) updates.sortOrder = body.sortOrder;

  db.update(schema.quickReplies)
    .set(updates)
    .where(eq(schema.quickReplies.id, Number(id)))
    .run();

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;

  db.delete(schema.quickReplies)
    .where(eq(schema.quickReplies.id, Number(id)))
    .run();

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/quick-replies/
git commit -m "feat(chat): add quick replies CRUD API"
```

---

## Task 9: Notifications Utility

**Files:**
- Create: `src/app/lib/notifications.ts`

- [ ] **Step 1: Create notifications helper**

```typescript
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

// --- Telegram ---

export async function sendTelegramNotification(text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMIN_CHAT_ID) return;

  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    }
  );
}

// --- Web Push ---

let webPush: typeof import("web-push") | null = null;

async function getWebPush() {
  if (!webPush) {
    webPush = await import("web-push");

    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

    if (vapidPublic && vapidPrivate) {
      webPush.setVapidDetails(
        "mailto:admin@astramotors.ru",
        vapidPublic,
        vapidPrivate
      );
    }
  }
  return webPush;
}

export async function sendPushToAllAdmins(
  title: string,
  body: string,
  url?: string
): Promise<void> {
  const wp = await getWebPush();
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  if (!vapidPublic) return;

  const subscriptions = db
    .select()
    .from(schema.pushSubscriptions)
    .all();

  const payload = JSON.stringify({ title, body, url });

  for (const sub of subscriptions) {
    const keys = JSON.parse(sub.keysJson);
    try {
      await wp.sendNotification(
        { endpoint: sub.endpoint, keys },
        payload
      );
    } catch {
      // Remove invalid subscription
      db.delete(schema.pushSubscriptions)
        .where(eq(schema.pushSubscriptions.id, sub.id))
        .run();
    }
  }
}

// --- Combined ---

export async function notifyAdminsNewMessage(
  conversationId: number,
  preview: string
): Promise<void> {
  const [conv] = db
    .select({
      customerName: schema.conversations.customerName,
    })
    .from(schema.conversations)
    .where(eq(schema.conversations.id, conversationId))
    .all();

  if (!conv) return;

  const name = conv.customerName || "Клиент";
  const short = preview.length > 100 ? preview.slice(0, 100) + "..." : preview;

  // Telegram
  sendTelegramNotification(
    `💬 Новое сообщение от <b>${name}</b>:\n${short}`
  ).catch(() => {});

  // Web Push
  sendPushToAllAdmins(
    `Сообщение от ${name}`,
    short,
    `/admin/conversations?open=${conversationId}`
  ).catch(() => {});
}
```

- [ ] **Step 2: Install web-push package**

```bash
npm install web-push
```

- [ ] **Step 3: Commit**

```bash
git add src/app/lib/notifications.ts package.json package-lock.json
git commit -m "feat(chat): add notifications utility (Telegram + Web Push)"
```

---

## Task 10: Push Subscription API + Service Worker

**Files:**
- Create: `src/app/api/admin/push-subscribe/route.ts`
- Create: `src/app/api/admin/vapid-key/route.ts`
- Create: `public/sw-push.js`

- [ ] **Step 1: Create VAPID public key endpoint**

```typescript
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? "";
  return NextResponse.json({ vapidPublicKey });
}
```

- [ ] **Step 2: Create push subscription endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const body = await req.json();
  const { endpoint, keys } = body;

  if (!endpoint || !keys) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // Upsert: remove old subscription for this admin+endpoint, insert new
  db.delete(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.adminId, auth.admin.id),
        eq(schema.pushSubscriptions.endpoint, endpoint)
      )
    )
    .run();

  db.insert(schema.pushSubscriptions)
    .values({
      adminId: auth.admin.id,
      endpoint,
      keysJson: JSON.stringify(keys),
      createdAt: new Date().toISOString(),
    })
    .run();

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create service worker**

```javascript
// public/sw-push.js
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Новое сообщение";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/admin/conversations" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin/conversations";
  event.waitUntil(clients.openWindow(url));
});
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/push-subscribe/route.ts src/app/api/admin/vapid-key/route.ts public/sw-push.js
git commit -m "feat(chat): add Web Push subscription API and service worker"
```

---

## Task 11: Admin Inbox Page — ConversationList Component

**Files:**
- Create: `src/app/admin/components/ConversationList.tsx`

- [ ] **Step 1: Create ConversationList component**

```typescript
"use client";

import { useRef, useState } from "react";

export interface ConversationListItem {
  id: number;
  channel: string;
  customerName: string;
  customerContact: string;
  unreadCount: number;
  assignedAdminId: number | null;
  lastMessageAt: string;
  lastMessage: {
    text: string;
    sender: string;
    createdAt: string;
  } | null;
}

interface ConversationListProps {
  conversations: ConversationListItem[];
  selectedId: number | null;
  filter: "all" | "unread";
  totalUnread: number;
  onSelect: (id: number) => void;
  onFilterChange: (filter: "all" | "unread") => void;
  onSearch: (query: string) => void;
}

export default function ConversationList({
  conversations,
  selectedId,
  filter,
  totalUnread,
  onSelect,
  onFilterChange,
  onSearch,
}: ConversationListProps) {
  const [localSearch, setLocalSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setLocalSearch(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(value), 300);
  }

  function formatTime(iso: string) {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  }

  return (
    <div className="flex flex-col h-full border-r border-gray-200 bg-white">
      {/* Filter tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => onFilterChange("unread")}
          className={`flex-1 py-3 text-sm font-medium ${
            filter === "unread"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Непрочитанные{totalUnread > 0 && ` (${totalUnread})`}
        </button>
        <button
          onClick={() => onFilterChange("all")}
          className={`flex-1 py-3 text-sm font-medium ${
            filter === "all"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Все
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <input
          type="text"
          placeholder="Поиск по имени или контакту..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Нет диалогов
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition ${
                selectedId === conv.id ? "bg-indigo-50" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm text-gray-900 truncate">
                  {conv.channel === "telegram" ? "📱" : "💬"}{" "}
                  {conv.customerName || "Без имени"}
                </span>
                <span className="text-xs text-gray-400 ml-2 shrink-0">
                  {formatTime(conv.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 truncate">
                  {conv.lastMessage
                    ? `${conv.lastMessage.sender === "admin" ? "Вы: " : ""}${conv.lastMessage.text.slice(0, 60)}`
                    : "Нет сообщений"}
                </span>
                {conv.unreadCount > 0 && (
                  <span className="ml-2 shrink-0 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/components/ConversationList.tsx
git commit -m "feat(chat): add ConversationList component"
```

---

## Task 12: Admin Inbox — ConversationChat Component

**Files:**
- Create: `src/app/admin/components/ConversationChat.tsx`
- Create: `src/app/admin/components/QuickRepliesPicker.tsx`

- [ ] **Step 1: Create QuickRepliesPicker**

```typescript
"use client";

import { useEffect, useState } from "react";

interface QuickReply {
  id: number;
  title: string;
  text: string;
}

interface QuickRepliesPickerProps {
  onSelect: (text: string) => void;
}

export default function QuickRepliesPicker({ onSelect }: QuickRepliesPickerProps) {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/quick-replies")
      .then((r) => r.json())
      .then((d) => setReplies(d.replies ?? []))
      .catch(() => {});
  }, []);

  if (replies.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-gray-400 hover:text-indigo-600 transition"
        title="Быстрые ответы"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg w-72 max-h-60 overflow-y-auto z-50">
          {replies.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onSelect(r.text);
                setOpen(false);
              }}
              className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <div className="text-sm font-medium text-gray-900">{r.title}</div>
              <div className="text-xs text-gray-500 truncate mt-0.5">{r.text}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ConversationChat component**

```typescript
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import QuickRepliesPicker from "./QuickRepliesPicker";

interface Message {
  id: number;
  sender: string;
  adminId: number | null;
  text: string;
  attachments: { url: string; originalName: string; size: number }[];
  isInternalNote: boolean;
  createdAt: string;
  readAt: string | null;
}

interface Admin {
  id: number;
  name: string;
}

interface ConversationChatProps {
  conversationId: number;
  currentAdminId: number;
}

export default function ConversationChat({
  conversationId,
  currentAdminId,
}: ConversationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isNote, setIsNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/conversations/${conversationId}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      // ignore
    }
  }, [conversationId]);

  // Initial load + mark read
  useEffect(() => {
    fetchMessages();
    fetch(`/api/admin/conversations/${conversationId}/read`, { method: "PUT" }).catch(() => {});
  }, [conversationId, fetchMessages]);

  // Polling every 3s
  useEffect(() => {
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() && !uploading) return;
    setSending(true);
    try {
      await fetch(`/api/admin/conversations/${conversationId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input.trim(),
          isInternalNote: isNote,
        }),
      });
      setInput("");
      setIsNote(false);
      fetchMessages();
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", String(conversationId));

      const res = await fetch("/api/admin/conversations/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        await fetch(`/api/admin/conversations/${conversationId}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "",
            attachments: [{ url: data.url, originalName: data.originalName, size: data.size }],
            isInternalNote: isNote,
          }),
        });
        fetchMessages();
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderAttachment(att: { url: string; originalName: string; size: number }) {
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(att.url);
    if (isImage) {
      return (
        <a href={att.url} target="_blank" rel="noreferrer" className="block mt-1">
          <img src={att.url} alt={att.originalName} className="max-w-48 max-h-48 rounded" />
        </a>
      );
    }
    return (
      <a
        href={att.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 mt-1 text-indigo-600 hover:underline text-sm"
      >
        📎 {att.originalName} ({(att.size / 1024).toFixed(0)} KB)
      </a>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[70%] rounded-xl px-4 py-2 ${
                msg.isInternalNote
                  ? "bg-yellow-100 border border-yellow-300"
                  : msg.sender === "admin"
                    ? "bg-indigo-600 text-white"
                    : "bg-white border border-gray-200"
              }`}
            >
              {msg.isInternalNote && (
                <div className="text-xs font-medium text-yellow-700 mb-1">
                  Заметка
                </div>
              )}
              {msg.text && (
                <p className={`text-sm whitespace-pre-wrap ${
                  msg.sender === "admin" && !msg.isInternalNote ? "text-white" : "text-gray-900"
                }`}>
                  {msg.text}
                </p>
              )}
              {msg.attachments.map((att, i) => (
                <div key={i}>{renderAttachment(att)}</div>
              ))}
              <div
                className={`text-xs mt-1 ${
                  msg.sender === "admin" && !msg.isInternalNote
                    ? "text-indigo-200"
                    : "text-gray-400"
                }`}
              >
                {formatTime(msg.createdAt)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-3">
        {isNote && (
          <div className="text-xs text-yellow-700 bg-yellow-50 px-3 py-1 rounded mb-2">
            Внутренняя заметка — клиент не увидит
          </div>
        )}
        <div className="flex items-end gap-2">
          <QuickRepliesPicker onSelect={(text) => setInput(text)} />

          <button
            type="button"
            onClick={() => setIsNote(!isNote)}
            className={`shrink-0 p-1.5 rounded transition ${
              isNote ? "text-yellow-600 bg-yellow-50" : "text-gray-400 hover:text-gray-600"
            }`}
            title={isNote ? "Обычное сообщение" : "Внутренняя заметка"}
          >
            📝
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 text-gray-400 hover:text-indigo-600 transition"
            title="Прикрепить файл"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isNote ? "Внутренняя заметка..." : "Сообщение..."}
            rows={1}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            onClick={handleSend}
            disabled={sending || (!input.trim() && !uploading)}
            className="shrink-0 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {sending ? "..." : "Отправить"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/components/ConversationChat.tsx src/app/admin/components/QuickRepliesPicker.tsx
git commit -m "feat(chat): add ConversationChat and QuickRepliesPicker components"
```

---

## Task 13: Admin Inbox — ConversationInfo Component

**Files:**
- Create: `src/app/admin/components/ConversationInfo.tsx`

- [ ] **Step 1: Create ConversationInfo component**

```typescript
"use client";

import { useEffect, useState } from "react";

interface ConversationData {
  id: number;
  channel: string;
  customerName: string;
  customerContact: string;
  status: string;
  assignedAdminId: number | null;
  createdAt: string;
}

interface Admin {
  id: number;
  name: string;
}

interface ConversationInfoProps {
  conversationId: number;
}

export default function ConversationInfo({ conversationId }: ConversationInfoProps) {
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [assignedAdminId, setAssignedAdminId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/admin/conversations/${conversationId}`)
      .then((r) => r.json())
      .then((data) => {
        setConversation(data.conversation);
        setAdmins(data.admins ?? []);
        setAssignedAdminId(data.conversation?.assignedAdminId ?? null);
      })
      .catch(() => {});
  }, [conversationId]);

  async function handleAssign(adminId: number | null) {
    setAssignedAdminId(adminId);
    await fetch(`/api/admin/conversations/${conversationId}/assign`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId }),
    });
  }

  if (!conversation) {
    return <div className="p-4 text-gray-400 text-sm">Загрузка...</div>;
  }

  return (
    <div className="p-4 space-y-4 bg-white h-full">
      <h3 className="font-semibold text-gray-900">Информация</h3>

      <div className="space-y-3 text-sm">
        <div>
          <div className="text-gray-500">Имя</div>
          <div className="font-medium text-gray-900">{conversation.customerName || "—"}</div>
        </div>

        <div>
          <div className="text-gray-500">Контакт</div>
          <div className="font-medium text-gray-900">{conversation.customerContact || "—"}</div>
        </div>

        <div>
          <div className="text-gray-500">Канал</div>
          <div className="font-medium text-gray-900">
            {conversation.channel === "telegram" ? "Telegram" : "Чат на сайте"}
          </div>
        </div>

        <div>
          <div className="text-gray-500">Дата обращения</div>
          <div className="font-medium text-gray-900">
            {new Date(conversation.createdAt).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        <div>
          <div className="text-gray-500 mb-1">Назначен</div>
          <select
            value={assignedAdminId ?? ""}
            onChange={(e) => handleAssign(e.target.value ? Number(e.target.value) : null)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Не назначен</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/components/ConversationInfo.tsx
git commit -m "feat(chat): add ConversationInfo panel component"
```

---

## Task 14: Admin Inbox Page

**Files:**
- Create: `src/app/admin/(app)/conversations/page.tsx`

- [ ] **Step 1: Create inbox page**

```typescript
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import AdminHeader from "@/app/admin/components/AdminHeader";
import ConversationList, {
  ConversationListItem,
} from "@/app/admin/components/ConversationList";
import ConversationChat from "@/app/admin/components/ConversationChat";
import ConversationInfo from "@/app/admin/components/ConversationInfo";

export default function ConversationsPage() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const [search, setSearch] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentAdminId, setCurrentAdminId] = useState<number>(0);

  // Get current admin
  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((r) => r.json())
      .then((d) => setCurrentAdminId(d.admin?.id ?? 0))
      .catch(() => {});
  }, []);

  // Open conversation from URL param
  useEffect(() => {
    const openId = searchParams.get("open");
    if (openId) setSelectedId(Number(openId));
  }, [searchParams]);

  const fetchConversations = useCallback(async () => {
    const params = new URLSearchParams();
    params.set("filter", filter);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/admin/conversations?${params}`);
      const data = await res.json();
      setConversations(data.conversations ?? []);
      setTotalUnread(data.totalUnread ?? 0);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Polling conversations list every 3s
  useEffect(() => {
    const interval = setInterval(fetchConversations, 3000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  return (
    <>
      <AdminHeader title="Чат и заявки" />

      <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 64px)" }}>
        {/* Left: conversation list */}
        <div className="w-80 shrink-0">
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            filter={filter}
            totalUnread={totalUnread}
            onSelect={(id) => {
              setSelectedId(id);
            }}
            onFilterChange={setFilter}
            onSearch={setSearch}
          />
        </div>

        {/* Center: chat */}
        <div className="flex-1 min-w-0">
          {selectedId ? (
            <ConversationChat
              conversationId={selectedId}
              currentAdminId={currentAdminId}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Выберите диалог
            </div>
          )}
        </div>

        {/* Right: info panel */}
        {selectedId && (
          <div className="w-72 shrink-0 border-l border-gray-200">
            <ConversationInfo conversationId={selectedId} />
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(app\)/conversations/page.tsx
git commit -m "feat(chat): add admin inbox page with three-panel layout"
```

---

## Task 15: Quick Replies Settings Page

**Files:**
- Create: `src/app/admin/components/QuickRepliesManager.tsx`
- Create: `src/app/admin/(app)/settings/quick-replies/page.tsx`

- [ ] **Step 1: Create QuickRepliesManager component**

```typescript
"use client";

import { useEffect, useState } from "react";

interface QuickReply {
  id: number;
  title: string;
  text: string;
  sortOrder: number;
}

export default function QuickRepliesManager() {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", text: "" });
  const [loading, setLoading] = useState(true);

  async function fetchReplies() {
    const res = await fetch("/api/admin/quick-replies");
    const data = await res.json();
    setReplies(data.replies ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchReplies();
  }, []);

  async function handleSave() {
    if (!form.title.trim() || !form.text.trim()) return;

    if (editingId) {
      await fetch(`/api/admin/quick-replies/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/admin/quick-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    setForm({ title: "", text: "" });
    setEditingId(null);
    fetchReplies();
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить шаблон?")) return;
    await fetch(`/api/admin/quick-replies/${id}`, { method: "DELETE" });
    fetchReplies();
  }

  function handleEdit(reply: QuickReply) {
    setEditingId(reply.id);
    setForm({ title: reply.title, text: reply.text });
  }

  function handleCancel() {
    setEditingId(null);
    setForm({ title: "", text: "" });
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {editingId ? "Редактировать шаблон" : "Новый шаблон"}
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Заголовок"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <textarea
            placeholder="Текст шаблона"
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!form.title.trim() || !form.text.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {editingId ? "Сохранить" : "Добавить"}
            </button>
            {editingId && (
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700 px-4 py-2 text-sm"
              >
                Отмена
              </button>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm">
        {replies.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            Нет шаблонов быстрых ответов
          </div>
        ) : (
          replies.map((reply) => (
            <div
              key={reply.id}
              className="flex items-start justify-between p-4 border-b border-gray-100 last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900">
                  {reply.title}
                </div>
                <div className="text-sm text-gray-500 mt-0.5 whitespace-pre-wrap">
                  {reply.text}
                </div>
              </div>
              <div className="flex gap-2 ml-4 shrink-0">
                <button
                  onClick={() => handleEdit(reply)}
                  className="text-indigo-600 hover:text-indigo-800 text-sm"
                >
                  Изменить
                </button>
                <button
                  onClick={() => handleDelete(reply.id)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create settings page**

```typescript
import AdminHeader from "@/app/admin/components/AdminHeader";
import QuickRepliesManager from "@/app/admin/components/QuickRepliesManager";

export default function QuickRepliesSettingsPage() {
  return (
    <>
      <AdminHeader title="Быстрые ответы" />
      <div className="p-6 max-w-3xl">
        <QuickRepliesManager />
      </div>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/components/QuickRepliesManager.tsx src/app/admin/\(app\)/settings/quick-replies/page.tsx
git commit -m "feat(chat): add quick replies settings page"
```

---

## Task 16: Chat Widget — Client Side

**Files:**
- Create: `src/app/components/ChatWidget.tsx`
- Create: `src/app/components/ChatStartForm.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create ChatStartForm component**

```typescript
"use client";

import { useState } from "react";

interface ChatStartFormProps {
  onStart: (conversationId: number) => void;
}

export default function ChatStartForm({ onStart }: ChatStartFormProps) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Введите имя");
      return;
    }
    if (!contact.trim()) {
      setError("Введите телефон или email");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), contact: contact.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        onStart(data.conversationId);
      }
    } catch {
      setError("Ошибка подключения");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      <div className="text-center mb-2">
        <div className="text-base font-semibold text-gray-900">Напишите нам</div>
        <div className="text-xs text-gray-500 mt-1">
          Обычно отвечаем в течение 15 минут
        </div>
      </div>

      <input
        type="text"
        placeholder="Ваше имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      <input
        type="text"
        placeholder="Телефон или email"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {error && <div className="text-red-500 text-xs">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        {loading ? "Подключение..." : "Начать чат"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create ChatWidget component**

```typescript
"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ChatStartForm from "./ChatStartForm";

interface ChatMessage {
  id: number;
  sender: string;
  text: string;
  attachments: { url: string; originalName: string; size: number }[];
  createdAt: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSeenIdRef = useRef(0);

  // Try to resume existing conversation on mount
  useEffect(() => {
    fetch("/api/chat/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", contact: "" }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.resumed && data.conversationId) {
          setConversationId(data.conversationId);
        }
      })
      .catch(() => {});
  }, []);

  // Restore open state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("chat_open");
    if (saved === "true") setOpen(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("chat_open", String(open));
  }, [open]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
      const data = await res.json();
      const msgs = data.messages ?? [];
      setMessages(msgs);

      // Count new admin messages since last seen
      if (!open && msgs.length > 0) {
        const newMsgs = msgs.filter(
          (m: ChatMessage) => m.id > lastSeenIdRef.current && m.sender === "admin"
        );
        if (newMsgs.length > 0) {
          setUnreadCount((prev) => prev + newMsgs.length);
        }
      }

      if (msgs.length > 0) {
        lastSeenIdRef.current = msgs[msgs.length - 1].id;
      }
    } catch {
      // ignore
    }
  }, [conversationId, open]);

  // Polling while widget is open or has conversation
  useEffect(() => {
    if (!conversationId) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [conversationId, fetchMessages]);

  // Clear unread when opening
  useEffect(() => {
    if (open) setUnreadCount(0);
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !conversationId) return;
    setSending(true);
    try {
      await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input.trim() }),
      });
      setInput("");
      fetchMessages();
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "",
            attachments: [{ url: data.url, originalName: data.originalName, size: data.size }],
          }),
        });
        fetchMessages();
      }
    } catch {
      // ignore
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Don't render on admin pages
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <>
      {/* Chat bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition z-50 flex items-center justify-center"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-6 right-6 w-[350px] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <div>
              <div className="font-semibold text-sm">Astra Motors</div>
              <div className="text-xs text-indigo-200">Онлайн</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-indigo-200 hover:text-white transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          {!conversationId ? (
            <ChatStartForm
              onStart={(id) => {
                setConversationId(id);
              }}
            />
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 text-xs py-8">
                    Напишите нам, мы поможем с подбором запчастей
                  </div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl px-3 py-2 ${
                        msg.sender === "customer"
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {msg.text && (
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      )}
                      {msg.attachments.map((att, i) => {
                        const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(att.url);
                        return isImage ? (
                          <a key={i} href={att.url} target="_blank" rel="noreferrer">
                            <img src={att.url} alt={att.originalName} className="max-w-full rounded mt-1" />
                          </a>
                        ) : (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs underline mt-1 block"
                          >
                            {att.originalName}
                          </a>
                        );
                      })}
                      <div
                        className={`text-xs mt-1 ${
                          msg.sender === "customer" ? "text-indigo-200" : "text-gray-400"
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-gray-200 p-3 flex items-end gap-2 shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-400 hover:text-indigo-600 transition shrink-0"
                >
                  📎
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Сообщение..."
                  rows={1}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 transition shrink-0"
                >
                  {sending ? "..." : "→"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Add ChatWidget to root layout**

In `src/app/layout.tsx`, import and add the ChatWidget component:

```typescript
import ChatWidget from "@/app/components/ChatWidget";
```

Add `<ChatWidget />` right after `<FloatingContactButtons />` (or before `<CookieConsentBanner />`).

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/ChatWidget.tsx src/app/components/ChatStartForm.tsx src/app/layout.tsx
git commit -m "feat(chat): add customer-facing chat widget"
```

---

## Task 17: Sidebar Unread Badge

**Files:**
- Modify: `src/app/admin/components/AdminSidebar.tsx`

- [ ] **Step 1: Add unread count state and polling to sidebar**

In `AdminSidebar.tsx`, add state for unread count:

```typescript
const [chatUnread, setChatUnread] = useState(0);

useEffect(() => {
  async function fetchUnread() {
    try {
      const res = await fetch("/api/admin/conversations/unread-count");
      const data = await res.json();
      setChatUnread(data.unreadCount ?? 0);
    } catch {
      // ignore
    }
  }
  fetchUnread();
  const interval = setInterval(fetchUnread, 30000); // every 30 seconds
  return () => clearInterval(interval);
}, []);
```

- [ ] **Step 2: Render badge next to "Чат и заявки" nav item**

In the nav item rendering, add badge for the conversations item:

```typescript
{item.href === "/admin/conversations" && chatUnread > 0 && (
  <span className="ml-auto bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
    {chatUnread}
  </span>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/components/AdminSidebar.tsx
git commit -m "feat(chat): add unread badge to sidebar chat nav item"
```

---

## Task 18: Admin Push Registration + Sound

**Files:**
- Modify: `src/app/admin/(app)/layout.tsx`

- [ ] **Step 1: Add push notification registration and sound to admin layout**

Create a client component wrapper that registers push and plays notification sound:

```typescript
"use client";

import { useEffect, useRef } from "react";

export default function AdminNotifications() {
  const lastUnreadRef = useRef<number>(0);

  useEffect(() => {
    // Register service worker and push subscription
    async function registerPush() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

      try {
        const reg = await navigator.serviceWorker.register("/sw-push.js");
        const res = await fetch("/api/admin/vapid-key");
        const { vapidPublicKey } = await res.json();
        if (!vapidPublicKey) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          const urlBase64ToUint8Array = (base64String: string) => {
            const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
            const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
            return outputArray;
          };

          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        await fetch("/api/admin/push-subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
              auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
            },
          }),
        });
      } catch {
        // Push not supported or denied
      }
    }

    registerPush();
  }, []);

  // Sound notification on new unread messages
  useEffect(() => {
    async function checkUnread() {
      try {
        const res = await fetch("/api/admin/conversations/unread-count");
        const data = await res.json();
        const current = data.unreadCount ?? 0;

        if (current > lastUnreadRef.current && lastUnreadRef.current >= 0) {
          // Play notification sound
          const soundEnabled = localStorage.getItem("chat_sound") !== "false";
          if (soundEnabled) {
            try {
              const audio = new Audio("/sounds/notification.mp3");
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch {
              // ignore
            }
          }
        }
        lastUnreadRef.current = current;
      } catch {
        // ignore
      }
    }

    // Set initial value without playing sound
    fetch("/api/admin/conversations/unread-count")
      .then((r) => r.json())
      .then((d) => { lastUnreadRef.current = d.unreadCount ?? 0; })
      .catch(() => {});

    const interval = setInterval(checkUnread, 5000);
    return () => clearInterval(interval);
  }, []);

  return null; // This component only handles side effects
}
```

- [ ] **Step 2: Add AdminNotifications to admin layout**

In `src/app/admin/(app)/layout.tsx`, import and render the component inside the layout.

- [ ] **Step 3: Add a notification sound file**

Place a short notification MP3 at `public/sounds/notification.mp3`. Use any free notification sound (< 50KB).

```bash
mkdir -p public/sounds
# Download or create a simple notification sound
# A placeholder will work — replace with actual sound file during deployment
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/components/AdminNotifications.tsx src/app/admin/\(app\)/layout.tsx public/sw-push.js public/sounds/
git commit -m "feat(chat): add Web Push registration, sound notifications in admin"
```

---

## Task 19: Final Integration & Verification

- [ ] **Step 1: Full build check**

```bash
npm run build
```

Expected: build succeeds with zero errors.

- [ ] **Step 2: Start dev server and verify widget**

```bash
npm run dev
```

Open `http://localhost:3000` — verify:
- Chat bubble visible in bottom-right corner
- Click opens chat window
- Start form collects name + contact
- Can send messages

- [ ] **Step 3: Verify admin inbox**

Open `http://localhost:3000/admin/conversations` — verify:
- Three-panel layout (list / chat / info)
- Conversations from widget appear
- Can reply, send files, create internal notes
- Quick replies picker works

- [ ] **Step 4: Verify quick replies settings**

Open `http://localhost:3000/admin/settings/quick-replies` — verify:
- Can add, edit, delete quick reply templates

- [ ] **Step 5: Verify sidebar badge**

Check sidebar shows unread count next to "Чат и заявки".

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(chat): Phase 4 complete — chat widget, admin inbox, notifications"
```
