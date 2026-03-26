# Ротация логов data/*.ndjson

Для ограничения роста служебных журналов используйте скрипт:

```bash
npm run logs:rotate
```

По умолчанию записи хранятся 180 дней. Можно переопределить:

```bash
DATA_LOG_RETENTION_DAYS=365 npm run logs:rotate
```

Рекомендуется запускать ежедневно через cron:

```bash
0 3 * * * cd /var/www/astra-motors && /usr/bin/npm run logs:rotate >> /var/log/astra-motors-log-rotate.log 2>&1
```

Скрипт обслуживает:

- `data/consent-events.ndjson`
- `data/orders.ndjson`
- `data/vin-requests.ndjson`
