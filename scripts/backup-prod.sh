#!/usr/bin/env bash
set -euo pipefail

SSH_HOST="${GM_SHOP_PROD_SSH:-root@5.42.117.221}"
PROD_ROOT="${GM_SHOP_PROD_ROOT:-/var/www/astra-motors}"
BACKUP_ROOT="${ASTRA_BACKUP_ROOT:-/var/backups/astra-motors}"
LOCAL_BACKUP_ROOT="${ASTRA_LOCAL_BACKUP_ROOT:-$HOME/Documents/astra-motors-backups}"

SCOPE="${ASTRA_BACKUP_SCOPE:-runtime}"
LABEL="${ASTRA_BACKUP_LABEL:-manual}"
KEEP_DAYS="${ASTRA_BACKUP_KEEP_DAYS:-30}"
DOWNLOAD=0
PRUNE="${ASTRA_BACKUP_PRUNE:-0}"
TELEGRAM="${ASTRA_BACKUP_TELEGRAM:-0}"

usage() {
  cat <<'USAGE'
Astra Motors production backup

Run from local Mac:
  bash scripts/backup-prod.sh
  bash scripts/backup-prod.sh --scope full --download

Options:
  --scope runtime   DB + uploads + manifest (default, small daily backup)
  --scope full      runtime + public/images/catalog (larger full backup)
  --label NAME      backup group: manual, daily, weekly
  --keep-days N     retention window for --prune
  --download        copy created backup to ~/Documents/astra-motors-backups
  --telegram        send a Telegram notification with backup path and size
  --prune           delete remote backups older than --keep-days in this label
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --scope)
      SCOPE="${2:-}"
      shift 2
      ;;
    --label)
      LABEL="${2:-}"
      shift 2
      ;;
    --keep-days)
      KEEP_DAYS="${2:-}"
      shift 2
      ;;
    --download)
      DOWNLOAD=1
      shift
      ;;
    --telegram)
      TELEGRAM=1
      shift
      ;;
    --prune)
      PRUNE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$SCOPE" != "runtime" && "$SCOPE" != "full" ]]; then
  echo "Bad --scope: $SCOPE (use runtime or full)" >&2
  exit 2
fi

load_remote_env() {
  if [[ -f "$PROD_ROOT/.env.local" ]]; then
    set -a
    # shellcheck disable=SC1091
    source "$PROD_ROOT/.env.local"
    set +a
  fi
}

send_telegram_notification() {
  local backup_dir="$1"
  local token="${TELEGRAM_BOT_TOKEN:-}"
  local chat_id="${TELEGRAM_BACKUP_CHAT_ID:-${TELEGRAM_ADMIN_CHAT_ID:-${TELEGRAM_CHAT_ID:-}}}"

  if [[ -z "$token" || -z "$chat_id" ]]; then
    echo "Telegram skipped: TELEGRAM_BOT_TOKEN or chat id is missing"
    return 0
  fi
  if ! command -v curl >/dev/null 2>&1; then
    echo "Telegram skipped: curl is missing"
    return 0
  fi

  local size
  size="$(du -sh "$backup_dir" | awk '{print $1}')"
  local text
  text="$(cat <<TEXT
Astra Motors backup created

Label: $LABEL
Scope: $SCOPE
Size: $size
Path: $backup_dir

Files stay on VPS. DB is not sent to Telegram because it contains private customer/order data.
TEXT
)"
  curl -fsS \
    -H "Content-Type: application/json" \
    -d "$(node -e 'const data={chat_id:process.argv[1],text:process.argv[2]}; process.stdout.write(JSON.stringify(data));' "$chat_id" "$text")" \
    "https://api.telegram.org/bot${token}/sendMessage" >/dev/null
  echo "Telegram notification sent"
}

remote_run() {
  cd "$PROD_ROOT"
  load_remote_env

  if ! command -v sqlite3 >/dev/null 2>&1; then
    echo "sqlite3 is required on VPS" >&2
    exit 1
  fi

  timestamp="$(date +%Y-%m-%d_%H-%M-%S)"
  backup_dir="$BACKUP_ROOT/$LABEL/$timestamp"
  mkdir -p "$backup_dir"

  db_path="$PROD_ROOT/data/shop.db"
  if [[ ! -f "$db_path" ]]; then
    echo "DB not found: $db_path" >&2
    exit 1
  fi

  sqlite3 "$db_path" ".backup '$backup_dir/shop.db'"

  if [[ -f "$PROD_ROOT/data/photo-manifest.json" ]]; then
    cp "$PROD_ROOT/data/photo-manifest.json" "$backup_dir/photo-manifest.json"
  fi

  if [[ -d "$PROD_ROOT/public/uploads" ]]; then
    tar -czf "$backup_dir/uploads.tar.gz" -C "$PROD_ROOT/public" uploads
  fi

  if [[ "$SCOPE" == "full" && -d "$PROD_ROOT/public/images/catalog" ]]; then
    tar -czf "$backup_dir/catalog-images.tar.gz" -C "$PROD_ROOT/public/images" catalog
  fi

  {
    echo "Astra Motors backup"
    echo "Created: $(date -Is)"
    echo "Label: $LABEL"
    echo "Scope: $SCOPE"
    echo "Server: $(hostname)"
    echo "Root: $PROD_ROOT"
    echo "Git: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
    echo
    echo "Files:"
    find "$backup_dir" -maxdepth 1 -type f -printf "  %f\n" | sort
    echo
    echo "Restore DB example:"
    echo "  pm2 stop astra-motors"
    echo "  cp $backup_dir/shop.db $PROD_ROOT/data/shop.db"
    echo "  pm2 start astra-motors"
    echo
    echo "Restore uploads example:"
    echo "  tar -xzf $backup_dir/uploads.tar.gz -C $PROD_ROOT/public"
    if [[ "$SCOPE" == "full" ]]; then
      echo
      echo "Restore catalog images example:"
      echo "  tar -xzf $backup_dir/catalog-images.tar.gz -C $PROD_ROOT/public/images"
    fi
  } > "$backup_dir/README.txt"

  (
    cd "$backup_dir"
    sha256sum * > SHA256SUMS
  )

  if [[ "$PRUNE" == "1" ]]; then
    find "$BACKUP_ROOT/$LABEL" -mindepth 1 -maxdepth 1 -type d -mtime "+$KEEP_DAYS" -print -exec rm -rf {} \;
  fi

  if [[ "$TELEGRAM" == "1" ]]; then
    send_telegram_notification "$backup_dir"
  fi

  echo "BACKUP_DIR=$backup_dir"
  du -sh "$backup_dir"
}

if [[ "${ASTRA_BACKUP_REMOTE:-0}" == "1" ]]; then
  remote_run
  exit 0
fi

ssh_cmd=(
  "cd '$PROD_ROOT' &&"
  "ASTRA_BACKUP_REMOTE=1"
  "ASTRA_BACKUP_SCOPE='$SCOPE'"
  "ASTRA_BACKUP_LABEL='$LABEL'"
  "ASTRA_BACKUP_KEEP_DAYS='$KEEP_DAYS'"
  "ASTRA_BACKUP_PRUNE='$PRUNE'"
  "ASTRA_BACKUP_TELEGRAM='$TELEGRAM'"
  "bash scripts/backup-prod.sh"
)

tmp_log="$(mktemp)"
ssh -o BatchMode=yes -o ConnectTimeout=15 "$SSH_HOST" "${ssh_cmd[*]}" | tee "$tmp_log"
remote_dir="$(awk -F= '/^BACKUP_DIR=/{print $2}' "$tmp_log" | tail -1)"
rm -f "$tmp_log"

if [[ "$DOWNLOAD" == "1" ]]; then
  if [[ -z "$remote_dir" ]]; then
    echo "Could not detect remote backup dir; download skipped" >&2
    exit 1
  fi
  mkdir -p "$LOCAL_BACKUP_ROOT/$LABEL"
  rsync -az "$SSH_HOST:$remote_dir/" "$LOCAL_BACKUP_ROOT/$LABEL/$(basename "$remote_dir")/"
  echo "LOCAL_BACKUP_DIR=$LOCAL_BACKUP_ROOT/$LABEL/$(basename "$remote_dir")"
  du -sh "$LOCAL_BACKUP_ROOT/$LABEL/$(basename "$remote_dir")"
fi
