# КарьерГид — Инструкция по деплою

## Что получишь в итоге
Публичная ссылка типа https://careerguid.onrender.com
Работает на любом телефоне и ПК, устанавливается как приложение (PWA)

---

## ШАГ 1 — GitHub Desktop

1. Скачай: https://desktop.github.com
2. Установи и войди в свой GitHub аккаунт
3. Нажми File → Add local repository
4. Выбери папку: C:\Users\Елнур\OneDrive\Desktop\CareerGuide
5. Нажми "create a repository"
6. Name: careerguid → Create Repository
7. В поле Summary напиши: Initial commit
8. Нажми "Commit to main"
9. Нажми "Publish repository" → Publish

---

## ШАГ 2 — Render.com

1. Зайди на https://render.com
2. Sign Up через GitHub
3. Нажми New + → Web Service
4. Выбери репозиторий careerguid
5. Проверь настройки:
   - Build Command:  npm run build
   - Start Command:  node server/index.js
   - Node Version:   18
6. Нажми Create Web Service
7. Жди 3-5 минут пока соберётся

---

## ШАГ 3 — Переменные окружения

В Render → твой сервис → Environment → Add Environment Variable

| Ключ            | Значение                        |
|-----------------|---------------------------------|
| JWT_SECRET      | careerguid_jwt_secret_2026      |
| TAVILY_API_KEY  | tvly-dev-w6Cg2-XgWSYsDImBDtn... |
| PORT            | 3001                            |

Опционально (если хочешь MongoDB):
| MONGODB_URI | mongodb+srv://... |

После добавления переменных — Render автоматически передеплоит.

---

## ШАГ 4 — UptimeRobot (чтобы сайт не засыпал)

1. Зайди на https://uptimerobot.com
2. Зарегистрируйся бесплатно
3. Нажми Add New Monitor
4. Monitor Type: HTTP(s)
5. Friendly Name: КарьерГид
6. URL: вставь свою ссылку от Render
7. Monitoring Interval: Every 5 minutes
8. Нажми Create Monitor

Теперь сайт никогда не заснёт.

---

## ШАГ 5 — Как пользователи устанавливают приложение

### Android (Chrome):
1. Открыть ссылку в Chrome
2. Нажать три точки → "Добавить на главный экран"
3. Нажать "Установить"

### iPhone (Safari):
1. Открыть ссылку в Safari (только Safari!)
2. Нажать кнопку "Поделиться" (квадрат со стрелкой)
3. Выбрать "На экран Домой"
4. Нажать "Добавить"

### ПК:
Просто открыть ссылку в браузере — всё работает.

---

## Обновление кода

Когда поменяешь код:
1. Открой GitHub Desktop
2. Напиши Summary (например: "Обновление")
3. Commit to main → Push origin
4. Render автоматически передеплоит за 3-5 минут

---

## Итог

- Ссылка: https://careerguid.onrender.com (или другая от Render)
- Бесплатно навсегда
- Без карты
- HTTPS включён автоматически
- PWA работает на Android и iPhone
