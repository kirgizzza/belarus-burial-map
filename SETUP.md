# Настройка Supabase и публикация в интернет

## Шаг 1. Создать проект в Supabase

1. Зарегистрируйтесь на [supabase.com](https://supabase.com) (бесплатно).
2. **New project** → выберите имя, пароль БД, регион (ближе к пользователям — лучше).
3. Дождитесь создания проекта (~1–2 минуты).

## Шаг 2. Создать таблицу

1. В проекте откройте **SQL Editor** → **New query**.
2. Скопируйте содержимое файла `supabase/schema.sql` и нажмите **Run**.
3. (Опционально) Запустите `supabase/seed.sql` — добавит 3 тестовых захоронения.

## Шаг 3. Создать админа

1. Откройте **Authentication** → **Users** → **Add user** → **Create new user**.
2. Укажите email и пароль — это логин для админки.
3. Включите **Auto Confirm User** (чтобы не подтверждать email).

## Шаг 4. Взять ключи API

1. **Project Settings** → **API**.
2. Скопируйте:
   - **Project URL** (например `https://abcdefgh.supabase.co`)
   - **anon public** key (длинная строка, начинается с `eyJ...`)

## Шаг 5. Настроить проект локально

**Windows (PowerShell):**
```powershell
Copy-Item public\config.example.js public\config.js
```

**macOS / Linux:**
```bash
cp public/config.example.js public/config.js
```

Откройте `public/config.js` и вставьте свои URL и anon key.

Запустите локальный сервер (любой из вариантов):

```bash
npx serve public
# или
python -m http.server 8080 --directory public
```

- Карта: `http://localhost:3000` (или `:8080`)
- Админка: `http://localhost:3000/admin`

Войдите в админку с email и паролем из шага 3. Сохраните запись — обновите карту (F5), данные должны появиться.

## Шаг 6. Выложить на Netlify

1. Залейте проект на GitHub.
2. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import from Git**.
3. Выберите репозиторий.
4. Build settings (уже в `netlify.toml`):
   - Build command: `node scripts/generate-config.js`
   - Publish directory: `public`
5. **Site settings** → **Environment variables** → добавьте:
   - `SUPABASE_URL` = ваш Project URL
   - `SUPABASE_ANON_KEY` = ваш anon key
6. **Deploy site**.

Сайт будет по адресу `https://ваш-сайт.netlify.app`:
- Карта: `/`
- Админка: `/admin`

## Как это работает

| Кто | Что происходит |
|-----|----------------|
| Посетитель | Открывает карту → данные загружаются из Supabase |
| Админ | Входит в `/admin` → редактирует → сохраняет в Supabase |
| Посетитель | Обновляет страницу (F5) → видит новые данные |

Задержка: **сразу после обновления страницы** (данные не кэшируются в localStorage).

## Безопасность

- **anon key** можно показывать в браузере — это нормально.
- Запись в БД разрешена только **вошедшим пользователям** (RLS-политики в `schema.sql`).
- Не публикуйте **service_role** key — он обходит все ограничения.
- Админку знают только те, кому вы дали email/пароль.

## Если что-то не работает

| Проблема | Решение |
|----------|---------|
| Карта пустая | Проверьте `config.js`, выполнен ли `schema.sql`, есть ли данные в Table Editor |
| «Неверный email или пароль» | Проверьте пользователя в Authentication → Users |
| Ошибка при сохранении | Убедитесь, что вы вошли в админку; проверьте RLS-политики |
| Netlify build failed | Добавьте `SUPABASE_URL` и `SUPABASE_ANON_KEY` в Environment variables |
