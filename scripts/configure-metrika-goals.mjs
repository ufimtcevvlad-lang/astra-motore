#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(new URL(".", import.meta.url).pathname, "..");

function readEnvFile(file) {
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return env;
}

const fileEnv = {
  ...readEnvFile(path.join(ROOT, ".env")),
  ...readEnvFile(path.join(ROOT, ".env.local")),
};

const token = process.env.YANDEX_METRIKA_OAUTH_TOKEN || fileEnv.YANDEX_METRIKA_OAUTH_TOKEN;
const counterId =
  process.env.YANDEX_METRIKA_COUNTER_ID ||
  process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID ||
  fileEnv.YANDEX_METRIKA_COUNTER_ID ||
  fileEnv.NEXT_PUBLIC_YANDEX_METRIKA_ID ||
  "108384071";

if (!token) {
  console.error("Нет YANDEX_METRIKA_OAUTH_TOKEN в env или .env.local");
  process.exit(1);
}

const goals = [
  ["Клик по телефону", "phone_click"],
  ["Клик WhatsApp", "whatsapp_click"],
  ["Клик Telegram", "telegram_click"],
  ["Добавление в корзину", "add_to_cart"],
  ["Заказ отправлен", "order_sent"],
  ["VIN-запрос отправлен", "vin_request_sent"],
  ["Поиск по сайту", "site_search"],
  ["Открытие корзины", "cart_open"],
];

const apiBase = `https://api-metrika.yandex.net/management/v1/counter/${counterId}`;
const headers = {
  Authorization: `OAuth ${token}`,
  "Content-Type": "application/json",
};

async function request(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = body?.message || body?.errors?.[0]?.message || res.statusText;
    throw new Error(`${res.status} ${message}`);
  }
  return body;
}

const existing = await request(`${apiBase}/goals`);
const existingGoals = existing.goals ?? [];
const existingActions = new Set(
  existingGoals.flatMap((goal) =>
    (goal.conditions ?? [])
      .filter((condition) => condition.type === "action" || condition.type === "exact")
      .map((condition) => condition.url),
  ),
);

for (const [name, actionId] of goals) {
  if (existingActions.has(actionId)) {
    console.log(`✓ уже есть: ${name} (${actionId})`);
    continue;
  }

  try {
    const created = await request(`${apiBase}/goals`, {
      method: "POST",
      body: JSON.stringify({
        goal: {
          name,
          type: "action",
          conditions: [{ type: "exact", url: actionId }],
        },
      }),
    });
    console.log(`+ создано: ${created.goal?.name ?? name} (${actionId})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("403")) {
      console.error(
        "Нет прав на создание целей. Токен подходит для чтения статистики, но не для управления счётчиком."
      );
    } else {
      console.error(`Не удалось создать цель ${name} (${actionId}): ${message}`);
    }
    process.exitCode = 1;
    break;
  }
}
