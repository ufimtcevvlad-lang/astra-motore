import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { db, schema } from "./db";
import { eq, lt } from "drizzle-orm";
import { cookies } from "next/headers";

// ─── Constants ───

export const ADMIN_SESSION_COOKIE = "am_admin_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CODE_MAX_ATTEMPTS = 3;
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_BLOCK_MS = 15 * 60 * 1000; // 15 minutes

// ─── Password hashing ───

export function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const resolvedSalt = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, resolvedSalt, 64).toString("hex");
  return { salt: resolvedSalt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ─── Login rate limiting (in-memory) ───

type LoginBlock = { attempts: number; blockedUntil?: number };
const loginAttempts = new Map<string, LoginBlock>();

export function isLoginBlocked(ip: string): boolean {
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (entry.blockedUntil && Date.now() < entry.blockedUntil) return true;
  if (entry.blockedUntil && Date.now() >= entry.blockedUntil) {
    loginAttempts.delete(ip);
    return false;
  }
  return false;
}

export function recordLoginAttempt(ip: string, success: boolean): void {
  if (success) {
    loginAttempts.delete(ip);
    return;
  }
  const entry = loginAttempts.get(ip) ?? { attempts: 0 };
  entry.attempts += 1;
  if (entry.attempts >= LOGIN_MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + LOGIN_BLOCK_MS;
  }
  loginAttempts.set(ip, entry);
}

// ─── Admin login ───

export async function verifyAdminLogin(
  login: string,
  password: string
): Promise<{ id: number; name: string; telegramChatId: string } | null> {
  const admin = await db.query.admins.findFirst({
    where: eq(schema.admins.login, login),
  });
  if (!admin) return null;
  const ok = verifyPassword(password, admin.passwordSalt, admin.passwordHash);
  if (!ok) return null;
  return { id: admin.id, name: admin.name, telegramChatId: admin.telegramChatId };
}

// ─── 2FA codes ───

export async function create2faCode(adminId: number): Promise<string> {
  // Delete old codes for this admin
  await db.delete(schema.admin2faCodes).where(eq(schema.admin2faCodes.adminId, adminId));

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const { salt, hash } = hashPassword(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);

  await db.insert(schema.admin2faCodes).values({
    adminId,
    codeHash: hash,
    codeSalt: salt,
    attempts: 0,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  });

  return code;
}

export async function verify2faCode(
  adminId: number,
  code: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const record = await db.query.admin2faCodes.findFirst({
    where: eq(schema.admin2faCodes.adminId, adminId),
  });

  if (!record) return { ok: false, reason: "Код не найден. Запросите новый." };

  if (new Date(record.expiresAt).getTime() < Date.now()) {
    await db.delete(schema.admin2faCodes).where(eq(schema.admin2faCodes.id, record.id));
    return { ok: false, reason: "Код истёк. Войдите снова." };
  }

  if (record.attempts >= CODE_MAX_ATTEMPTS) {
    return { ok: false, reason: "Превышено число попыток. Войдите снова." };
  }

  const ok = verifyPassword(code, record.codeSalt, record.codeHash);
  if (!ok) {
    await db
      .update(schema.admin2faCodes)
      .set({ attempts: record.attempts + 1 })
      .where(eq(schema.admin2faCodes.id, record.id));
    return { ok: false, reason: "Неверный код." };
  }

  await db.delete(schema.admin2faCodes).where(eq(schema.admin2faCodes.id, record.id));
  return { ok: true };
}

// ─── Sessions ───

export async function createAdminSession(
  adminId: number,
  ip?: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);

  await db.insert(schema.adminSessions).values({
    tokenHash,
    adminId,
    ip: ip ?? null,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  });

  return { token, expiresAt };
}

export async function deleteAdminSession(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await db.delete(schema.adminSessions).where(eq(schema.adminSessions.tokenHash, tokenHash));
}

export async function getAdminBySessionToken(
  token: string
): Promise<{ id: number; login: string; name: string; telegramChatId: string } | null> {
  const tokenHash = hashToken(token);

  // Clean up expired sessions (best-effort)
  await db
    .delete(schema.adminSessions)
    .where(lt(schema.adminSessions.expiresAt, new Date().toISOString()));

  const session = await db.query.adminSessions.findFirst({
    where: eq(schema.adminSessions.tokenHash, tokenHash),
  });
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) return null;

  const admin = await db.query.admins.findFirst({
    where: eq(schema.admins.id, session.adminId),
  });
  if (!admin) return null;

  return {
    id: admin.id,
    login: admin.login,
    name: admin.name,
    telegramChatId: admin.telegramChatId,
  };
}

export async function getSessionAdmin(): Promise<{
  id: number;
  login: string;
  name: string;
  telegramChatId: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return getAdminBySessionToken(token);
}

// ─── Admin management ───

export async function createAdmin(input: {
  login: string;
  password: string;
  name: string;
  telegramChatId: string;
}): Promise<void> {
  const { salt, hash } = hashPassword(input.password);
  const now = new Date().toISOString();
  await db.insert(schema.admins).values({
    login: input.login,
    passwordHash: hash,
    passwordSalt: salt,
    name: input.name,
    telegramChatId: input.telegramChatId,
    createdAt: now,
    updatedAt: now,
  });
}
