# Astra Motors Backups

## Where Backups Live

Production VPS:

- App: `/var/www/astra-motors`
- Main DB: `/var/www/astra-motors/data/shop.db`
- Backups: `/var/backups/astra-motors`
- Backup log: `/var/log/astra-motors-backup.log`
- Telegram copy: runtime backups can be sent to the admin chat

Local Mac, only when started with `--download`:

- `~/Documents/astra-motors-backups`

## Backup Types

`runtime` backup is small and should run every day:

- `shop.db` via SQLite `.backup`
- `photo-manifest.json`
- `public/uploads`
- `README.txt`
- `SHA256SUMS`

`full` backup is larger and should run weekly:

- everything from `runtime`
- `public/images/catalog`

Current size guide:

- DB: less than 1 MB
- uploads: about 3.5 MB
- catalog images: about 43 MB
- VPS free space: about 41 GB

## Manual Commands

Small manual backup on VPS:

```bash
bash scripts/backup-prod.sh
```

Full manual backup on VPS:

```bash
bash scripts/backup-prod.sh --scope full --label manual
```

Full backup and copy it to the Mac:

```bash
bash scripts/backup-prod.sh --scope full --label manual --download
```

Runtime backup and send it to Telegram:

```bash
bash scripts/backup-prod.sh --scope runtime --label manual --telegram
```

## Automatic Schedule

Recommended production schedule:

- daily `runtime` at 03:20 Asia/Yekaterinburg, keep 30 days
- weekly `full` on Monday at 03:30 Asia/Yekaterinburg, keep 90 days
- daily `runtime` is also sent to Telegram
- weekly `full` is not sent to Telegram by default because image archives can become large

Cron file:

- `/etc/cron.d/astra-motors-backup`

## Restore Notes

Stop the site before restoring the DB:

```bash
pm2 stop astra-motors
cp /var/backups/astra-motors/manual/<timestamp>/shop.db /var/www/astra-motors/data/shop.db
pm2 start astra-motors
```

Restore uploads:

```bash
tar -xzf /var/backups/astra-motors/manual/<timestamp>/uploads.tar.gz -C /var/www/astra-motors/public
```

Restore catalog images from a full backup:

```bash
tar -xzf /var/backups/astra-motors/weekly/<timestamp>/catalog-images.tar.gz -C /var/www/astra-motors/public/images
```

Important: before restoring production data, create a fresh emergency backup first.
