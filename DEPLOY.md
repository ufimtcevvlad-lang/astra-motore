# Деплой Astra Motors — команды одним списком

**Каталог сайта на VPS:** `/var/www/astra-motors` · **PM2:** `astra-motors` · **IP в примерах:** `5.42.117.221`

---

## Чеклист: обновить сайт на сервере

1. **На Mac** — код в GitHub: `git add`, `commit`, `push origin main`.
2. **Проверка SSH с Mac:** `ssh root@5.42.117.221` (должен зайти без ошибки `Permission denied`).
3. **Деплой одной командой** (из папки проекта на Mac, после `git pull` репозитория):

   ```bash
   cd ~/Documents/autoparts-shop
   git pull origin main
   npm run deploy:vps
   ```

   Скрипт сам зайдёт на сервер, сделает `git pull`, сборку и `pm2 restart astra-motors`.

Если шаг 2 не работает — см. раздел **«SSH: Permission denied»** ниже.  
Если не уверены в папке на сервере — зайдите по SSH и выполните `pm2 show astra-motors` и посмотрите **exec cwd** (там должен быть путь к проекту). Тогда:

```bash
REMOTE_DIR=/точный/путь/из/pm2 npm run deploy:vps
```

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

### SSH: `Permission denied (publickey,password)`

Нужен вход по ключу (скрипт `deploy:vps` не запрашивает пароль интерактивно).

**На Mac** — есть ли ключ:

```bash
ls -la ~/.ssh/id_ed25519.pub ~/.ssh/id_rsa.pub 2>/dev/null
```

Если файла нет — создать:

```bash
ssh-keygen -t ed25519 -C "твой-email" -f ~/.ssh/id_ed25519 -N ""
```

Показать **публичный** ключ и добавить его на сервер (в панели Timeweb «SSH-ключи» или один раз зайти по паролю и вставить в файл):

```bash
cat ~/.ssh/id_ed25519.pub
```

На сервере (под root), если зашли по паролю из консоли хостинга:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo 'ВСТАВЬ_СЮДА_ОДНУ_СТРОКУ_ИЗ_id_ed25519.pub' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Потом с Mac:

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
ssh root@5.42.117.221
```

Когда `ssh` без пароля заходит — снова `npm run deploy:vps`.

---

### Ошибки при деплое

| Симптом | Что сделать |
|--------|-------------|
| `cd: ... No such file` | Вы не в `/var/www/astra-motors` — проверьте `pm2 show astra-motors` → **exec cwd**, передайте `REMOTE_DIR=...`. |
| `not a git repository` | В этой папке нет клона репозитория — нужна правильная директория или `git clone` заново. |
| `npm ... package.json` в `/root` | Команды запускали из домашней папки, не из каталога проекта — сначала `cd /var/www/astra-motors`. |
| Скрипт с Mac падает сразу | Часто нет ключа в агенте: `ssh-add ~/.ssh/id_ed25519` или используйте **вариант B** вручную в сессии SSH. |

---

- После `push` на **Vercel** (если проект привязан к репо) сборка идёт автоматически.
- Полная установка с нуля (Node, PM2, nginx): **`TIMEWEB-ИНСТРУКЦИЯ.md`**.
- Переменные окружения на сервере: **`/var/www/astra-motors/.env.local`** (см. `.env.example`).
