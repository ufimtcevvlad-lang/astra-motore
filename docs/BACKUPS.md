# Astra Motors Backups

Цель: после любой ошибки, поломки VPS или неудачного импорта можно безопасно вернуть сайт, товары, заказы, заявки и фотографии.

## Если Нужно Быстро Вспомнить

Главный файл-инструкция:

- локально в проекте: `/Users/vladislavufimcev/Documents/autoparts-shop/docs/BACKUPS.md`
- на VPS после деплоя: `/var/www/astra-motors/docs/BACKUPS.md`

Где лежит сайт на VPS:

- код сайта: `/var/www/astra-motors`
- база товаров/заказов: `/var/www/astra-motors/data/shop.db`
- дополнительные базы, если есть: `/var/www/astra-motors/data/*.db`
- загруженные фото: `/var/www/astra-motors/public/uploads`
- фото каталога: `/var/www/astra-motors/public/images/catalog`
- фото с водяным знаком: `/var/www/astra-motors/public/images/watermarked`

Где лежат бэкапы:

- на VPS: `/var/backups/astra-motors`
- на Mac: `/Users/vladislavufimcev/Documents/astra-motors-backups`
- первый проверенный полный бэкап: `/var/backups/astra-motors/manual/2026-05-01_15-20-42`
- его копия на Mac: `/Users/vladislavufimcev/Documents/astra-motors-backups/manual/2026-05-01_15-20-42`

Где лежит автоматическое расписание:

- cron-файл на VPS: `/etc/cron.d/astra-motors-backup`
- лог автоматических бэкапов: `/var/log/astra-motors-backup.log`

Самая полезная ручная команда перед любым рискованным действием:

```bash
cd /Users/vladislavufimcev/Documents/autoparts-shop
bash scripts/backup-prod.sh --scope full --label manual --download --telegram
```

Как понять, что бэкап нормальный:

- в Telegram пришло сообщение об успехе;
- в папке бэкапа есть `shop.db`, `runtime-data.tar.gz`, `uploads.tar.gz`, `catalog-images.tar.gz`, `watermarked-images.tar.gz`;
- файл `sqlite-integrity.txt` содержит `ok`;
- команда `sha256sum -c SHA256SUMS` внутри папки бэкапа показывает `OK`.

Главное правило при аварии: ничего не удалять. Сначала сделать свежий аварийный бэкап, потом восстанавливать.

## Простая Логика

Держим 3 уровня защиты:

- `daily` - каждый день, маленький бэкап рабочих данных.
- `weekly` - раз в неделю, полный бэкап рабочих данных и всех фото.
- `manual` - вручную перед рискованными действиями: импорт, миграция, чистка фото, обновление логики заказов.

Храним минимум в 2 местах:

- VPS: `/var/backups/astra-motors`
- Mac при запуске с `--download`: `~/Documents/astra-motors-backups`

Важное правило: перед восстановлением всегда сначала сделать свежий `manual`-бэкап текущего состояния. Даже если состояние плохое, это страховка от второй ошибки.

## Что Попадает В Бэкап

`runtime` - ежедневный рабочий бэкап:

- все SQLite базы из `data/*.db`, включая `shop.db`, через безопасный SQLite `.backup`;
- проверка целостности каждой базы: `PRAGMA integrity_check`;
- `data/*.json`, включая `photo-manifest.json`;
- runtime-файлы `data/*.ndjson`, если они есть: заказы, VIN-заявки, согласия, сессии, SMS-коды и похожие журналы;
- `public/uploads`, то есть фото, загруженные через админку/чат/импорт;
- `README.txt`, `file-sizes.txt`, `sqlite-integrity.txt`, `SHA256SUMS`.

`full` - полный недельный бэкап:

- все из `runtime`;
- `public/images/catalog` - исходные фото каталога;
- `public/images/watermarked` - готовые фото с водяными знаками.

Водяные знаки технически можно пересоздать из исходных фото, но мы кладем их в `full`, чтобы после аварии поднять сайт быстрее.

## Где Лежит На Продакшене

- приложение: `/var/www/astra-motors`
- основная база: `/var/www/astra-motors/data/shop.db`
- бэкапы: `/var/backups/astra-motors`
- лог cron-бэкапов: `/var/log/astra-motors-backup.log`
- cron-файл: `/etc/cron.d/astra-motors-backup`

Структура папок:

```text
/var/backups/astra-motors/
  daily/
    2026-05-01_03-20-00/
  weekly/
    2026-05-04_03-30-00/
  monthly/
    2026-06-01_03-40-00/
  manual/
    2026-05-01_16-10-00/
```

## Расписание

Рекомендуемое расписание для продакшена:

- ежедневно `runtime` в 03:20 по Екатеринбургу, хранить 30 дней;
- еженедельно `full` по понедельникам в 03:30, хранить 90 дней;
- ежемесячно `full` первого числа в 03:40, хранить 365 дней;
- уведомление в Telegram отправлять только со статусом, размером и путем к папке;
- сами файлы бэкапа в Telegram не отправлять, потому что там могут быть персональные данные клиентов.

## Команды

Маленький ручной бэкап:

```bash
bash scripts/backup-prod.sh --scope runtime --label manual
```

Полный ручной бэкап:

```bash
bash scripts/backup-prod.sh --scope full --label manual
```

Полный бэкап и копия на Mac:

```bash
bash scripts/backup-prod.sh --scope full --label manual --download
```

Ежедневный бэкап с чисткой старых копий и Telegram-уведомлением:

```bash
bash scripts/backup-prod.sh --scope runtime --label daily --keep-days 30 --prune --telegram
```

Недельный полный бэкап:

```bash
bash scripts/backup-prod.sh --scope full --label weekly --keep-days 90 --prune --telegram
```

Месячный полный бэкап:

```bash
bash scripts/backup-prod.sh --scope full --label monthly --keep-days 365 --prune --telegram
```

## Проверка Бэкапа

В каждой папке бэкапа должны быть:

- `shop.db` и, если есть, другие `.db`;
- `sqlite-integrity.txt` со строками вида `shop.db: ok`;
- `SHA256SUMS` для проверки, что файлы не повреждены;
- `README.txt` с составом и примерами восстановления;
- для `runtime`: `runtime-data.tar.gz`, `uploads.tar.gz`;
- для `full`: еще `catalog-images.tar.gz`, `watermarked-images.tar.gz`.

Проверить контрольные суммы внутри папки бэкапа:

```bash
sha256sum -c SHA256SUMS
```

## Восстановление

1. Сначала сделать аварийный бэкап текущего состояния:

```bash
bash scripts/backup-prod.sh --scope full --label emergency
```

2. Остановить сайт:

```bash
pm2 stop astra-motors
```

3. Вернуть базу:

```bash
cp /var/backups/astra-motors/manual/<timestamp>/shop.db /var/www/astra-motors/data/shop.db
```

4. Вернуть runtime-файлы:

```bash
tar -xzf /var/backups/astra-motors/manual/<timestamp>/runtime-data.tar.gz -C /var/www/astra-motors
```

5. Вернуть uploads:

```bash
tar -xzf /var/backups/astra-motors/manual/<timestamp>/uploads.tar.gz -C /var/www/astra-motors/public
```

6. Если это `full`-бэкап, вернуть фото каталога и водяные знаки:

```bash
tar -xzf /var/backups/astra-motors/weekly/<timestamp>/catalog-images.tar.gz -C /var/www/astra-motors/public/images
tar -xzf /var/backups/astra-motors/weekly/<timestamp>/watermarked-images.tar.gz -C /var/www/astra-motors/public/images
```

7. Запустить сайт:

```bash
pm2 start astra-motors
```

8. Проверить главную, каталог, карточку товара, админку, заказы и загрузку фото.

## Жесткие Правила

- Не удалять старые бэкапы вручную, пока не понятно, что есть рабочая свежая копия.
- Не хранить единственную копию только на VPS.
- Не отправлять базы и архивы с заказами в Telegram/мессенджеры.
- Перед импортом или массовой правкой делать `manual full`.
- После восстановления сначала проверять сайт, потом уже продолжать новые изменения.
