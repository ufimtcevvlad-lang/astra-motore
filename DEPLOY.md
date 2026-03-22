# Деплой Astra Motors

## 1. Залить изменения в GitHub (локально)

```bash
cd /path/to/autoparts-shop
git add public/logo-astra-motors.png src/app/components/Header.tsx src/app/globals.css DEPLOY.md
git status
git commit -m "feat: логотип Astra Motors в шапке (палитра сайта)"
git push origin main
```

Если проект на **Vercel** и привязан к репозиторию — после `push` сборка запустится сама. Проверь дашборд Vercel и домен.

---

## 2. Обновить сайт на VPS (Timeweb / свой сервер)

Подключись по SSH и выполни в папке проекта (путь как в `TIMEWEB-ИНСТРУКЦИЯ.md`):

```bash
ssh root@ВАШ_IP
```

```bash
cd /var/www/astra-motors
git pull origin main
npm install
npm run build
pm2 restart astra-motors
```

Проверка:

```bash
curl -sI http://localhost:3000 | head -5
pm2 logs astra-motors --lines 30
```

Полная установка с нуля (Node, PM2, nginx, clone) — в файле **`TIMEWEB-ИНСТРУКЦИЯ.md`**.

---

## 3. Переменные окружения на сервере

Не забудь `.env.local` в `/var/www/astra-motors/` (см. `.env.example` и README).
