import { randomBytes, scryptSync } from "node:crypto";
import * as readline from "node:readline";
import { runMigrations } from "../src/app/lib/db/migrate";
import { db, schema } from "../src/app/lib/db";

// ─── Password hashing (copied from admin-auth to avoid next/headers import) ───

function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const resolvedSalt = salt ?? randomBytes(16).toString("hex");
  const hash = scryptSync(password, resolvedSalt, 64).toString("hex");
  return { salt: resolvedSalt, hash };
}

// ─── Prompt helpers ───

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function askPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    let password = "";

    const onData = (char: string) => {
      if (char === "\n" || char === "\r" || char === "\u0003") {
        if (char === "\u0003") process.exit();
        process.stdin.setRawMode?.(false);
        process.stdin.pause();
        process.stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(password);
      } else if (char === "\u007f") {
        // backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write("\b \b");
        }
      } else {
        password += char;
        process.stdout.write("*");
      }
    };

    process.stdin.on("data", onData);
  });
}

// ─── Main ───

async function main() {
  console.log("\n=== Создание администратора ===\n");

  // Run migrations to ensure tables exist
  try {
    runMigrations();
    console.log("Миграции применены.\n");
  } catch (e) {
    console.error("Ошибка миграций:", e);
    process.exit(1);
  }

  // Check existing admins
  const existing = await db.select().from(schema.admins);

  if (existing.length > 0) {
    console.log("Существующие администраторы:");
    for (const admin of existing) {
      console.log(`  [${admin.id}] ${admin.login} — ${admin.name}`);
    }
    console.log();

    const answer = await ask("Добавить ещё одного администратора? (y/N): ");
    if (answer.toLowerCase() !== "y" && answer.toLowerCase() !== "yes") {
      console.log("Отменено.");
      rl.close();
      process.exit(0);
    }
    console.log();
  }

  // Collect data
  const login = await ask("Логин: ");
  if (!login) {
    console.error("Логин не может быть пустым.");
    rl.close();
    process.exit(1);
  }

  const password = await askPassword("Пароль: ");
  if (!password || password.length < 8) {
    console.error("Пароль должен быть не менее 8 символов.");
    rl.close();
    process.exit(1);
  }

  const passwordConfirm = await askPassword("Повторите пароль: ");
  if (password !== passwordConfirm) {
    console.error("Пароли не совпадают.");
    rl.close();
    process.exit(1);
  }

  const name = await ask("Имя (отображается в интерфейсе): ");
  if (!name) {
    console.error("Имя не может быть пустым.");
    rl.close();
    process.exit(1);
  }

  const telegramChatId = await ask("Telegram Chat ID (для 2FA кодов): ");
  if (!telegramChatId) {
    console.error("Telegram Chat ID не может быть пустым.");
    rl.close();
    process.exit(1);
  }

  rl.close();

  // Create admin
  try {
    const { salt, hash } = hashPassword(password);
    const now = new Date().toISOString();

    await db.insert(schema.admins).values({
      login,
      passwordHash: hash,
      passwordSalt: salt,
      name,
      telegramChatId,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`\nАдминистратор "${name}" (${login}) успешно создан.`);
  } catch (e: unknown) {
    const err = e as { message?: string };
    if (err.message?.includes("UNIQUE constraint failed")) {
      console.error(`\nОшибка: логин "${login}" уже занят.`);
    } else {
      console.error("\nОшибка при создании администратора:", e);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
