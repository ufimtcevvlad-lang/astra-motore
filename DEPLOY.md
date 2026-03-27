# Деплой Astra Motors — команды одним списком

Подставь свой путь к проекту на Mac и IP/папку на сервере при необходимости.

**После любых правок в коде:** сначала блок «На Mac», затем «На сервере» — так сайт на VPS совпадёт с GitHub.

---

### На Mac (коммит и отправка в GitHub)

```bash
cd ~/Documents/autoparts-shop
git status
git add -A
git commit -m "deploy: обновление сайта"
git push origin main
```

---

### На сервере (обновление уже установленного сайта)

**Каталог проекта на VPS:** `/var/www/astra-motors` (не копируйте заглушку «/путь/к/проекту»).

#### Вариант A — одна команда с Mac (если `ssh root@5.42.117.221` уже работает)

Из корня репозитория на своём компьютере:

```bash
./scripts/deploy-vps.sh
```

При другом хосте или папке:

```bash
SSH_HOST=root@ДРУГОЙ_IP REMOTE_DIR=/var/www/astra-motors ./scripts/deploy-vps.sh
```

#### Вариант B — вручную по SSH

```bash
ssh root@5.42.117.221
cd /var/www/astra-motors
git pull origin main
npm ci
npm run build
pm2 restart astra-motors
pm2 save
curl -sI http://127.0.0.1:3000 | head -10
pm2 logs astra-motors --lines 25
```

Если `npm ci` ругается на lock-файл, замените на `npm install`.

---

- После `push` на **Vercel** (если проект привязан к репо) сборка идёт автоматически.
- Полная установка с нуля (Node, PM2, nginx): **`TIMEWEB-ИНСТРУКЦИЯ.md`**.
- Переменные окружения на сервере: **`/var/www/astra-motors/.env.local`** (см. `.env.example`).
