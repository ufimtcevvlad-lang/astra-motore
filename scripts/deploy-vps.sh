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

ssh $SSH_OPTS "$SSH_HOST" bash -s <<REMOTE
set -euo pipefail
cd "$REMOTE_DIR"
if [[ ! -d .git ]]; then
  echo "Ошибка: в $REMOTE_DIR нет .git — проверьте путь (pm2 show astra-motors)." >&2
  exit 1
fi
git fetch origin
git pull origin main
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
