require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { connectDB } = require('./db');
const authRouter = require('./auth');

const app = express();
const allowedOrigins = process.env.ALLOWED_ORIGIN
  ? [process.env.ALLOWED_ORIGIN]
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'];
app.use(cors({ origin: (origin, cb) => cb(null, !origin || allowedOrigins.some(o => origin.startsWith(o)) || true) }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Требуется авторизация' });
  try {
    const { userId } = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET || 'careerguid_jwt_secret_2026');
    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ error: 'Токен недействителен — войди снова' });
  }
}

const ASSISTANT_SYSTEM = `Ты — ИИ-ассистент "КарьерГид" 🎓. Помогаешь студенту с его СОБСТВЕННЫМ планом поступления — он уже знает свою цель и сам ведёт список задач, ты только помогаешь по запросу. Отвечаешь на вопросы о:
- Поступлении в зарубежные университеты (документы, сроки, требования)
- Языковых экзаменах (IELTS, TOEFL, SAT, GRE)
- Студенческих визах и разрешениях на учёбу
- Стипендиях, грантах, финансовой помощи
- Написании мотивационных писем и эссе
- Жизни студента за рубежом
- Сравнении стран и университетов

Отвечай на русском. Коротко и по делу (3-5 предложений). Используй эмодзи.
Если вопрос не по теме — мягко перенаправь на образовательную сферу.
ВАЖНО ПРО ЧЕСТНОСТЬ: если называешь конкретные цифры (стоимость, дедлайны, суммы стипендий) — добавляй что рекомендуешь уточнить на официальном сайте, так как данные могут меняться.`;

function requireGroq(res) {
  if (!process.env.GROQ_API_KEY) {
    res.status(500).json({ error: 'ИИ временно недоступен. Попробуй позже.' });
    return null;
  }
  const Groq = require('groq-sdk');
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

app.post('/api/assistant', requireAuth, async (req, res) => {
  const { messages } = req.body;
  const client = requireGroq(res);
  if (!client) return;
  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      messages: [{ role: 'system', content: ASSISTANT_SYSTEM }, ...messages]
    });
    res.json({ message: response.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-daily-tasks', requireAuth, async (req, res) => {
  const { items, goal } = req.body;
  const client = requireGroq(res);
  if (!client) return;
  try {
    const itemsList = (items || []).map(t => t.title).join('; ');

    const prompt = `Студент сам написал себе такой план поступления. Разбей ЕГО задачи на 7 конкретных ежедневных задач на первую неделю. Ответь ТОЛЬКО JSON.

Цель студента: ${goal || 'не указана'}
Задачи из его плана: ${itemsList || 'пока нет задач'}

{
  "tasks": [
    {
      "title": "Конкретное действие (глагол + что делать), основанное на задачах студента",
      "category": "documents",
      "type": "daily",
      "dueDate": "сегодня",
      "note": "Зачем это нужно (1 предложение)"
    }
  ]
}

Категории: documents, languages, universities, essays, study, finances, other
Задачи должны быть конкретными и опираться на то, что студент сам написал (не выдумывай новую цель).
Ответь ТОЛЬКО JSON.`;

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }]
    });

    let text = response.choices[0].message.content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let data;
    try { data = JSON.parse(text); }
    catch { const m = text.match(/\{[\s\S]*\}/); data = m ? JSON.parse(m[0]) : { tasks: [] }; }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function reverseGeocode(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
      headers: { 'User-Agent': 'CareerGuid/1.0 (contact: forethercoder@gmail.com)' }
    });
    const data = await res.json();
    const a = data.address || {};
    return a.city || a.town || a.village || a.county || null;
  } catch { return null; }
}

app.post('/api/suggest-local', requireAuth, async (req, res) => {
  const { lat, lon, city, topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'Не указана тема поиска' });
  if (!process.env.TAVILY_API_KEY) return res.status(500).json({ error: 'Поиск временно недоступен' });

  try {
    let resolvedCity = city || null;
    if (!resolvedCity && lat != null && lon != null) {
      resolvedCity = await reverseGeocode(lat, lon);
    }
    if (!resolvedCity) return res.status(400).json({ error: 'Не удалось определить город' });

    const tavilyKey = process.env.TAVILY_API_KEY;
    const query = `${topic} courses OR prep centers in ${resolvedCity}, online alternatives`;
    const searchRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyKey,
        query,
        search_depth: 'basic',
        include_answer: false,
        max_results: 6
      })
    });
    const data = await searchRes.json();
    const results = (data.results || []).map(r => ({ title: r.title, url: r.url, content: r.content }));
    res.json({ city: resolvedCity, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const clientBuild = path.join(__dirname, '../client/dist');
if (require('fs').existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(clientBuild, 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🎓 КарьерГид сервер запущен!`);
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`✅ Готов к работе\n`);
  });
}).catch(err => {
  console.error('❌ Ошибка подключения к БД:', err.message);
  process.exit(1);
});
