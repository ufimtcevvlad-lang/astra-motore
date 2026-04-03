#!/usr/bin/env bash
# Одна команда с Mac: обновить код на VPS и пересобрать Next.js (pm2: astra-motors).
# Требуется: ssh root@5.42.117.221 без пароля (ключ в ssh-agent) или задайте SSH_OPTS.
#
# Примеры:
#   ./scripts/deploy-vps.sh
#   SSH_HOST=user@example.com REMOTE_DIR=/var/www/astra-motors ./scripts/deploy-vps.sh

set -euo pipefail

SSH_HOST="${SSH_HOST:-root@5.42.117.221}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/astra-motors}"
SSH_OPTS="${SSH_OPTS:--o BatchMode=yes -o ConnectTimeout=15}"

echo "→ SSH: $SSH_HOST"
echo "→ Каталог: $REMOTE_DIR"

# Одинарные кавычки у delimiter — иначе локальный bash подставит ${key}/${METRIKA_ID} до ssh (set -u → ошибка).
ssh $SSH_OPTS "$SSH_HOST" env REMOTE_DIR="$REMOTE_DIR" bash -s <<'REMOTE'
set -euo pipefail
cd "$REMOTE_DIR"
if [[ ! -d .git ]]; then
  echo "Ошибка: в $REMOTE_DIR нет .git — проверьте путь (pm2 show astra-motors)." >&2
  exit 1
fi
git fetch origin
git pull origin main

# ID Яндекс.Метрики (счётчик 108384071): дописываем в .env.local только если ключа ещё нет.
METRIKA_ID="108384071"
touch .env.local
for key in NEXT_PUBLIC_YANDEX_METRIKA_ID YANDEX_METRIKA_COUNTER_ID; do
  if ! grep -q "^${key}=" .env.local; then
    echo "${key}=${METRIKA_ID}" >> .env.local
    echo "→ Добавлено в .env.local: ${key}=${METRIKA_ID}"
  fi
done
# Замена устаревшего счётчика на сервере (если был старый ID)
if grep -qE '^NEXT_PUBLIC_YANDEX_METRIKA_ID=107737371' .env.local ||
   grep -qE '^YANDEX_METRIKA_COUNTER_ID=107737371' .env.local; then
  sed -i.bak-metrika \
    -e 's/^NEXT_PUBLIC_YANDEX_METRIKA_ID=107737371/NEXT_PUBLIC_YANDEX_METRIKA_ID='"${METRIKA_ID}"'/' \
    -e 's/^YANDEX_METRIKA_COUNTER_ID=107737371/YANDEX_METRIKA_COUNTER_ID='"${METRIKA_ID}"'/' \
    .env.local
  echo "→ Обновлён старый ID Метрики 107737371 → ${METRIKA_ID} в .env.local"
fi

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
npm run build
pm2 restart astra-motors
pm2 save
echo "→ Готово. Проверка:"
curl -sI -o /dev/null -w "%{http_code} http://127.0.0.1:3000\n" http://127.0.0.1:3000 || true
REMOTE

echo "→ Деплой завершён."
