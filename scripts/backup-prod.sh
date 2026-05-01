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
  --scope runtime   SQLite DBs + runtime data + uploads (default, daily backup)
  --scope full      runtime + catalog images + watermarked images (weekly backup)
  --label NAME      backup group: manual, daily, weekly, monthly
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

if [[ ! "$LABEL" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "Bad --label: $LABEL (use only letters, numbers, dot, underscore, dash)" >&2
  exit 2
fi

if [[ ! "$KEEP_DAYS" =~ ^[0-9]+$ ]]; then
  echo "Bad --keep-days: $KEEP_DAYS (use a number)" >&2
  exit 2
fi

load_remote_env() {
  local env_file="$PROD_ROOT/.env.local"
  local key
  local value

  if [[ ! -f "$env_file" ]]; then
    return 0
  fi

  while IFS='=' read -r key value || [[ -n "$key" ]]; do
    [[ -z "$key" || "$key" == \#* ]] && continue
    case "$key" in
      TELEGRAM_BOT_TOKEN|TELEGRAM_BACKUP_CHAT_ID|TELEGRAM_ADMIN_CHAT_ID|TELEGRAM_CHAT_ID)
        value="${value%$'\r'}"
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        export "$key=$value"
        ;;
    esac
  done < "$env_file"
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
Backup was restore-tested automatically.
TEXT
)"
  curl -fsS \
    -H "Content-Type: application/json" \
    -d "$(node -e 'const data={chat_id:process.argv[1],text:process.argv[2]}; process.stdout.write(JSON.stringify(data));' "$chat_id" "$text")" \
    "https://api.telegram.org/bot${token}/sendMessage" >/dev/null
  echo "Telegram notification sent"
}

created_at() {
  date "+%Y-%m-%dT%H:%M:%S%z"
}

sha256_one() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1"
  else
    echo "sha256sum or shasum is required" >&2
    exit 1
  fi
}

verify_sha256s() {
  local backup_dir="$1"

  (
    cd "$backup_dir"
    if command -v sha256sum >/dev/null 2>&1; then
      sha256sum -c SHA256SUMS
    elif command -v shasum >/dev/null 2>&1; then
      shasum -a 256 -c SHA256SUMS
    else
      echo "sha256sum or shasum is required" >&2
      exit 1
    fi
  )
}

verify_backup_restore() {
  local backup_dir="$1"
  local verify_dir
  local restored_root
  local db_file
  local db_name
  local integrity
  local count

  verify_dir="$(mktemp -d "${TMPDIR:-/tmp}/astra-backup-verify.XXXXXX")"
  restored_root="$verify_dir/app"
  mkdir -p "$restored_root/public" "$restored_root/public/images"
  trap 'rm -rf "$verify_dir"; trap - RETURN' RETURN

  {
    echo "Astra Motors automatic restore test"
    echo "Created: $(created_at)"
    echo "Backup: $backup_dir"
    echo
    echo "SHA256:"
    verify_sha256s "$backup_dir" | sed 's/^/  /'
    echo
    echo "SQLite restore:"
    shopt -s nullglob
    for db_file in "$backup_dir"/*.db; do
      db_name="$(basename "$db_file")"
      cp "$db_file" "$restored_root/$db_name"
      integrity="$(sqlite3 "$restored_root/$db_name" "PRAGMA integrity_check;")"
      echo "  $db_name: $integrity"
      if [[ "$integrity" != "ok" ]]; then
        echo "SQLite restore test failed for $db_name: $integrity" >&2
        return 1
      fi
    done
    shopt -u nullglob
    echo
    echo "Archive restore:"
    if [[ -f "$backup_dir/runtime-data.tar.gz" ]]; then
      tar -tzf "$backup_dir/runtime-data.tar.gz" >/dev/null
      tar -xzf "$backup_dir/runtime-data.tar.gz" -C "$restored_root"
      count="$(find "$restored_root/data" -type f 2>/dev/null | wc -l | awk '{print $1}')"
      echo "  runtime-data.tar.gz: ok ($count files)"
    fi
    if [[ -f "$backup_dir/uploads.tar.gz" ]]; then
      tar -tzf "$backup_dir/uploads.tar.gz" >/dev/null
      tar -xzf "$backup_dir/uploads.tar.gz" -C "$restored_root/public"
      count="$(find "$restored_root/public/uploads" -type f 2>/dev/null | wc -l | awk '{print $1}')"
      echo "  uploads.tar.gz: ok ($count files)"
    fi
    if [[ -f "$backup_dir/catalog-images.tar.gz" ]]; then
      tar -tzf "$backup_dir/catalog-images.tar.gz" >/dev/null
      tar -xzf "$backup_dir/catalog-images.tar.gz" -C "$restored_root/public/images"
      count="$(find "$restored_root/public/images/catalog" -type f 2>/dev/null | wc -l | awk '{print $1}')"
      echo "  catalog-images.tar.gz: ok ($count files)"
    fi
    if [[ -f "$backup_dir/watermarked-images.tar.gz" ]]; then
      tar -tzf "$backup_dir/watermarked-images.tar.gz" >/dev/null
      tar -xzf "$backup_dir/watermarked-images.tar.gz" -C "$restored_root/public/images"
      count="$(find "$restored_root/public/images/watermarked" -type f 2>/dev/null | wc -l | awk '{print $1}')"
      echo "  watermarked-images.tar.gz: ok ($count files)"
    fi
    echo
    echo "Result: ok"
  } > "$backup_dir/RESTORE_TEST.txt"
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
  chmod 700 "$BACKUP_ROOT" "$BACKUP_ROOT/$LABEL" "$backup_dir"

  db_path="$PROD_ROOT/data/shop.db"
  if [[ ! -f "$db_path" ]]; then
    echo "DB not found: $db_path" >&2
    exit 1
  fi

  : > "$backup_dir/sqlite-integrity.txt"
  shopt -s nullglob
  db_files=("$PROD_ROOT"/data/*.db)
  shopt -u nullglob
  if [[ "${#db_files[@]}" -eq 0 ]]; then
    echo "No SQLite DB files found in $PROD_ROOT/data" >&2
    exit 1
  fi

  for db_file in "${db_files[@]}"; do
    db_name="$(basename "$db_file")"
    sqlite3 "$db_file" ".backup '$backup_dir/$db_name'"
    integrity="$(sqlite3 "$backup_dir/$db_name" "PRAGMA integrity_check;")"
    printf "%s: %s\n" "$db_name" "$integrity" >> "$backup_dir/sqlite-integrity.txt"
    if [[ "$integrity" != "ok" ]]; then
      echo "SQLite integrity check failed for $db_name: $integrity" >&2
      exit 1
    fi
    rm -f "$backup_dir/$db_name-shm" "$backup_dir/$db_name-wal"
  done

  if [[ -f "$PROD_ROOT/data/photo-manifest.json" ]]; then
    cp "$PROD_ROOT/data/photo-manifest.json" "$backup_dir/photo-manifest.json"
  fi

  runtime_data_files=()
  shopt -s nullglob
  for runtime_file in "$PROD_ROOT"/data/*.json "$PROD_ROOT"/data/*.ndjson; do
    runtime_data_files+=("data/$(basename "$runtime_file")")
  done
  shopt -u nullglob
  if [[ "${#runtime_data_files[@]}" -gt 0 ]]; then
    tar -czf "$backup_dir/runtime-data.tar.gz" -C "$PROD_ROOT" "${runtime_data_files[@]}"
  fi

  if [[ -d "$PROD_ROOT/public/uploads" ]]; then
    tar -czf "$backup_dir/uploads.tar.gz" -C "$PROD_ROOT/public" uploads
  fi

  if [[ "$SCOPE" == "full" && -d "$PROD_ROOT/public/images/catalog" ]]; then
    tar -czf "$backup_dir/catalog-images.tar.gz" -C "$PROD_ROOT/public/images" catalog
  fi

  if [[ "$SCOPE" == "full" && -d "$PROD_ROOT/public/images/watermarked" ]]; then
    tar -czf "$backup_dir/watermarked-images.tar.gz" -C "$PROD_ROOT/public/images" watermarked
  fi

  du -sh "$backup_dir"/* > "$backup_dir/file-sizes.txt" 2>/dev/null || true

  {
    echo "Astra Motors backup"
    echo "Created: $(created_at)"
    echo "Label: $LABEL"
    echo "Scope: $SCOPE"
    echo "Server: $(hostname)"
    echo "Root: $PROD_ROOT"
    echo "Git: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
    echo
    echo "Files:"
    find "$backup_dir" -maxdepth 1 -type f -exec basename {} \; | sort | sed 's/^/  /'
    echo
    echo "SQLite integrity:"
    sed 's/^/  /' "$backup_dir/sqlite-integrity.txt"
    echo
    echo "Restore DB example:"
    echo "  pm2 stop astra-motors"
    echo "  cp $backup_dir/shop.db $PROD_ROOT/data/shop.db"
    echo "  pm2 start astra-motors"
    echo
    echo "Restore uploads example:"
    echo "  tar -xzf $backup_dir/uploads.tar.gz -C $PROD_ROOT/public"
    echo
    echo "Restore runtime data example:"
    echo "  tar -xzf $backup_dir/runtime-data.tar.gz -C $PROD_ROOT"
    if [[ "$SCOPE" == "full" ]]; then
      echo
      echo "Restore catalog images example:"
      echo "  tar -xzf $backup_dir/catalog-images.tar.gz -C $PROD_ROOT/public/images"
      echo
      echo "Restore watermarked images example:"
      echo "  tar -xzf $backup_dir/watermarked-images.tar.gz -C $PROD_ROOT/public/images"
    fi
  } > "$backup_dir/README.txt"

  (
    cd "$backup_dir"
    find . -maxdepth 1 -type f ! -name SHA256SUMS -exec basename {} \; | sort | while IFS= read -r file_name; do
      sha256_one "$file_name"
    done > SHA256SUMS
  )

  verify_backup_restore "$backup_dir"

  (
    cd "$backup_dir"
    find . -maxdepth 1 -type f ! -name SHA256SUMS -exec basename {} \; | sort | while IFS= read -r file_name; do
      sha256_one "$file_name"
    done > SHA256SUMS
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
