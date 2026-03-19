import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

type UserRecord = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordSalt: string;
  passwordHash: string;
  vkId?: string;
  tgId?: string;
  tgUsername?: string;
  createdAt: string;
};

type SessionRecord = {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

type SmsCodeRecord = {
  phone: string;
  codeSalt: string;
  codeHash: string;
  createdAt: string;
  expiresAt: string;
  attempts: number;
};

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.ndjson");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.ndjson");
const SMS_CODES_FILE = path.join(DATA_DIR, "sms-codes.ndjson");

export const SESSION_COOKIE = "am_session";
export const SOCIAL_PENDING_COOKIE = "am_social_pending";
const SESSION_TTL_DAYS = 30;

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function parseNdjson<T>(raw: string): T[] {
  const out: T[] = [];
  for (const line of raw.split(/\r?\n/).filter(Boolean)) {
    try {
      out.push(JSON.parse(line));
    } catch {
      // Skip invalid lines
    }
  }
  return out;
}

async function readNdjsonFile<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return parseNdjson<T>(raw);
  } catch {
    return [];
  }
}

async function appendNdjson(filePath: string, row: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.appendFile(filePath, JSON.stringify(row) + "\n", "utf8");
}

async function rewriteNdjson(filePath: string, rows: unknown[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const body = rows.map((r) => JSON.stringify(r)).join("\n");
  await fs.writeFile(filePath, body ? body + "\n" : "", "utf8");
}

async function readUsers(): Promise<UserRecord[]> {
  return readNdjsonFile<UserRecord>(USERS_FILE);
}

async function writeUsers(users: UserRecord[]): Promise<void> {
  await rewriteNdjson(USERS_FILE, users);
}

export function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const resolvedSalt = salt || randomBytes(16).toString("hex");
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

export async function findUserByLogin(login: string): Promise<UserRecord | null> {
  const users = await readUsers();
  const candidate = login.includes("@")
    ? users.find((u) => normalizeEmail(u.email) === normalizeEmail(login))
    : users.find((u) => normalizePhone(u.phone) === normalizePhone(login));
  return candidate || null;
}

export function normalizePhoneForAuth(phone: string): string {
  return normalizePhone(phone);
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  const users = await readUsers();
  return users.find((u) => u.id === userId) || null;
}

export async function findUserByProvider(
  provider: "vk" | "telegram",
  providerUserId: string
): Promise<UserRecord | null> {
  const users = await readUsers();
  if (provider === "vk") {
    return users.find((u) => u.vkId === providerUserId) || null;
  }
  return users.find((u) => u.tgId === providerUserId) || null;
}

export async function registerUser(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<{ ok: true; user: Omit<UserRecord, "passwordSalt" | "passwordHash"> } | { ok: false; reason: string }> {
  const fullName = input.fullName.trim();
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const password = input.password;

  if (!fullName || !email || !phone || !password) {
    return { ok: false, reason: "Заполните все обязательные поля" };
  }
  if (password.length < 8) {
    return { ok: false, reason: "Пароль должен содержать минимум 8 символов" };
  }

  const users = await readUsers();
  if (users.some((u) => normalizeEmail(u.email) === email)) {
    return { ok: false, reason: "Пользователь с таким email уже существует" };
  }
  if (users.some((u) => normalizePhone(u.phone) === phone)) {
    return { ok: false, reason: "Пользователь с таким телефоном уже существует" };
  }

  const id = randomBytes(12).toString("hex");
  const { salt, hash } = hashPassword(password);
  const user: UserRecord = {
    id,
    fullName,
    email,
    phone,
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  };
  await appendNdjson(USERS_FILE, user);

  return {
    ok: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdAt,
    },
  };
}

export async function registerUserWithProvider(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  provider: "vk" | "telegram";
  providerUserId: string;
  tgUsername?: string;
}): Promise<{ ok: true; user: Omit<UserRecord, "passwordSalt" | "passwordHash"> } | { ok: false; reason: string }> {
  const base = await registerUser({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    password: input.password,
  });
  if (!base.ok) return base;

  const users = await readUsers();
  const idx = users.findIndex((u) => u.id === base.user.id);
  if (idx === -1) {
    return { ok: false, reason: "Не удалось сохранить соцсвязку" };
  }
  if (input.provider === "vk") {
    users[idx].vkId = input.providerUserId;
  } else {
    users[idx].tgId = input.providerUserId;
    users[idx].tgUsername = input.tgUsername;
  }
  await writeUsers(users);

  const updated = users[idx];
  return {
    ok: true,
    user: {
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      vkId: updated.vkId,
      tgId: updated.tgId,
      tgUsername: updated.tgUsername,
      createdAt: updated.createdAt,
    },
  };
}

export async function createSession(
  userId: string,
  options?: { ttlDays?: number }
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const ttlDays = options?.ttlDays ?? SESSION_TTL_DAYS;
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
  const row: SessionRecord = {
    tokenHash: hashToken(token),
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  await appendNdjson(SESSIONS_FILE, row);
  return { token, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  const targetHash = hashToken(token);
  const sessions = await readNdjsonFile<SessionRecord>(SESSIONS_FILE);
  const filtered = sessions.filter((s) => s.tokenHash !== targetHash);
  await rewriteNdjson(SESSIONS_FILE, filtered);
}

export async function getSessionUser(token: string): Promise<Omit<UserRecord, "passwordSalt" | "passwordHash"> | null> {
  const tokenHash = hashToken(token);
  const sessions = await readNdjsonFile<SessionRecord>(SESSIONS_FILE);
  const now = Date.now();

  const validSessions = sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
  if (validSessions.length !== sessions.length) {
    await rewriteNdjson(SESSIONS_FILE, validSessions);
  }

  const active = validSessions.find((s) => s.tokenHash === tokenHash);
  if (!active) return null;

  const user = await findUserById(active.userId);
  if (!user) return null;

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    vkId: user.vkId,
    tgId: user.tgId,
    tgUsername: user.tgUsername,
    createdAt: user.createdAt,
  };
}

const SMS_CODE_TTL_MS = 5 * 60 * 1000;
const SMS_MAX_ATTEMPTS = 5;
const SMS_RETRY_COOLDOWN_MS = 60 * 1000;

function randomSmsCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function readSmsCodes(): Promise<SmsCodeRecord[]> {
  const rows = await readNdjsonFile<SmsCodeRecord>(SMS_CODES_FILE);
  const now = Date.now();
  const valid = rows.filter((r) => new Date(r.expiresAt).getTime() > now);
  if (valid.length !== rows.length) {
    await rewriteNdjson(SMS_CODES_FILE, valid);
  }
  return valid;
}

export async function createSmsCodeForPhone(phoneInput: string): Promise<
  | { ok: true; phone: string; code: string }
  | { ok: false; reason: string }
> {
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, reason: "Введите телефон" };

  const user = await findUserByLogin(phone);
  if (!user) {
    return { ok: false, reason: "Пользователь с таким телефоном не найден. Сначала зарегистрируйтесь." };
  }

  const rows = await readSmsCodes();
  const latestForPhone = rows
    .filter((r) => r.phone === phone)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  if (
    latestForPhone &&
    Date.now() - new Date(latestForPhone.createdAt).getTime() < SMS_RETRY_COOLDOWN_MS
  ) {
    return { ok: false, reason: "Код уже отправлен. Повторите через минуту." };
  }

  const code = randomSmsCode();
  const { salt, hash } = hashPassword(code);
  const now = new Date();
  const row: SmsCodeRecord = {
    phone,
    codeSalt: salt,
    codeHash: hash,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SMS_CODE_TTL_MS).toISOString(),
    attempts: 0,
  };
  await appendNdjson(SMS_CODES_FILE, row);
  return { ok: true, phone, code };
}

export async function verifySmsCodeForPhone(phoneInput: string, codeInput: string): Promise<
  | { ok: true; userId: string }
  | { ok: false; reason: string }
> {
  const phone = normalizePhone(phoneInput);
  const code = String(codeInput || "").trim();
  if (!phone || !code) return { ok: false, reason: "Введите телефон и код" };

  const user = await findUserByLogin(phone);
  if (!user) return { ok: false, reason: "Пользователь не найден" };

  const rows = await readSmsCodes();
  const sorted = rows
    .filter((r) => r.phone === phone)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const current = sorted[0];
  if (!current) return { ok: false, reason: "Сначала запросите SMS-код" };
  if (current.attempts >= SMS_MAX_ATTEMPTS) return { ok: false, reason: "Превышено число попыток. Запросите код заново." };

  const ok = verifyPassword(code, current.codeSalt, current.codeHash);
  if (!ok) {
    const updated = rows.map((r) =>
      r === current ? { ...r, attempts: r.attempts + 1 } : r
    );
    await rewriteNdjson(SMS_CODES_FILE, updated);
    return { ok: false, reason: "Неверный SMS-код" };
  }

  const filtered = rows.filter((r) => r.phone !== phone);
  await rewriteNdjson(SMS_CODES_FILE, filtered);
  return { ok: true, userId: user.id };
}

