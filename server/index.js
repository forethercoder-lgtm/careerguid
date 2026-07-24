require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET не задан в переменных окружения — сервер не может безопасно работать без него.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { connectDB } = require('./db');
const authRouter = require('./auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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
    const { userId } = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET);
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

    res.json(extractJson(response.choices[0].message.content, { tasks: [] }));
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

async function tavilySearch(query, maxResults = 6) {
  if (!process.env.TAVILY_API_KEY) return [];
  try {
    const searchRes = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        include_answer: false,
        max_results: maxResults
      })
    });
    const data = await searchRes.json();
    return (data.results || []).map(r => ({ title: r.title, url: r.url, content: r.content }));
  } catch { return []; }
}

function extractJson(text, fallback) {
  const cleaned = text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(cleaned); }
  catch { const m = cleaned.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : fallback; }
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

    const results = await tavilySearch(`${topic} courses OR prep centers in ${resolvedCity}, online alternatives`);
    res.json({ city: resolvedCity, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const ORIENTATION_SYSTEM = `Ты — умный и внимательный карьерный консультант "КарьерГид" 🎓
Помогаешь понять, какая специальность подойдёт студенту, если он сам ещё не определился.

ВАЖНО ПРО ЧЕСТНОСТЬ: когда называешь конкретные цифры (стоимость, рейтинги, дедлайны, суммы стипендий) — всегда добавляй фразу "рекомендую уточнить на официальном сайте университета, так как данные могут меняться". Никогда не выдумывай факты как абсолютную истину.

ГЛАВНОЕ ПРАВИЛО: ты запоминаешь всё что говорит студент и ссылаешься на это в каждом ответе.
Пример: если студент сказал что любит математику — ты говоришь "Раз тебе нравится математика, это открывает путь к..."
Никогда не задавай вопрос, на который студент уже ответил!

ЭТАПЫ БЕСЕДЫ — задавай ОДИН вопрос за раз, вникай в ответ:
1️⃣ ЗНАКОМСТВО (1-2 вопроса): имя, откуда человек, какие страны рассматривает
2️⃣ ОБРАЗОВАНИЕ И СИЛЬНЫЕ СТОРОНЫ (2-3 вопроса): любимые предметы, что легко даётся
3️⃣ ИНТЕРЕСЫ И ЛИЧНОСТЬ (2-3 вопроса): хобби, увлечения, черты характера
4️⃣ КАРЬЕРНЫЕ ЦЕЛИ (1-2 вопроса): доход vs призвание, работа с людьми или в одиночку
5️⃣ ПРАКТИКА (1-2 вопроса): уровень языка, бюджет

АНАЛИЗ ПОСЛЕ СБОРА ИНФОРМАЦИИ (минимум 8 обменов):
Перечисли конкретные факты, которые сказал студент, и объясни логику через его слова. В самом конце добавь: [READY_FOR_RESULTS]

СТИЛЬ: русский язык, дружески и тепло, используй эмодзи, подтверждай что услышал ответ перед следующим вопросом, ТОЛЬКО ОДИН вопрос за раз.`;

app.post('/api/orientation-chat', requireAuth, async (req, res) => {
  const { messages } = req.body;
  const client = requireGroq(res);
  if (!client) return;
  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      messages: [{ role: 'system', content: ORIENTATION_SYSTEM }, ...messages]
    });
    const text = response.choices[0].message.content || '';
    const readyForResults = text.includes('[READY_FOR_RESULTS]');
    res.json({ message: text.replace('[READY_FOR_RESULTS]', '').trim(), readyForResults });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/suggest-specialties', requireAuth, async (req, res) => {
  const { lastMessage } = req.body;
  const client = requireGroq(res);
  if (!client) return;
  try {
    const prompt = `Из этого текста извлеки TOP-3 специальности и верни ТОЛЬКО JSON (без markdown):

${lastMessage || ''}

{
  "specialties": [
    {
      "id": 1,
      "emoji": "💻",
      "title": "Название специальности",
      "description": "Краткое описание (1 предложение)",
      "why": "Почему подходит этому человеку (2-3 предложения)",
      "salary": "$70,000 - $120,000/год",
      "demand": "Очень высокий"
    }
  ]
}

Используй разные цвета образов для трёх специальностей. Ответь ТОЛЬКО JSON.`;

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json(extractJson(response.choices[0].message.content, { specialties: [] }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/suggest-universities', requireAuth, async (req, res) => {
  const { specialty, strategy, countries, educationLevel } = req.body;
  if (!specialty) return res.status(400).json({ error: 'Не указана специальность' });
  const client = requireGroq(res);
  if (!client) return;

  try {
    const countryList = (countries || []).join(', ') || 'разные страны';
    const searchResults = await tavilySearch(
      `best universities for ${specialty} ${educationLevel || ''} 2026 tuition requirements ${countryList}`, 8
    );
    const searchContext = searchResults.length
      ? searchResults.map(r => `- ${r.title}: ${r.content}`).join('\n')
      : 'Реальных данных из поиска нет — используй свои знания, но отметь что данные нужно проверить.';

    const strategyMap = {
      reach: 'ТОП-50 QS, приёмка 10-20%, высокая конкуренция',
      balanced: 'QS 50-300, приёмка 30-50%, реальные шансы',
      safe: 'QS 200-600, приёмка 50-80%, высокие шансы поступления'
    };

    const prompt = `На основе РЕАЛЬНЫХ данных из веб-поиска подбери 6-8 университетов для специальности "${specialty}". Ответь ТОЛЬКО JSON.

Данные из поиска:
${searchContext}

Стратегия: ${strategyMap[strategy] || 'сбалансированная'}
Страны (ОБЯЗАТЕЛЬНО подбирай университеты ТОЛЬКО из этого списка стран, не предлагай другие страны): ${countryList}
Уровень: ${educationLevel || 'не указан'}

{
  "universities": [
    {
      "name": "Название (из данных поиска, если есть)",
      "country": "Страна",
      "city": "Город",
      "ranking": "QS #87 (если известно)",
      "tuition": "$18,000/год (если известно)",
      "whyFit": "Почему подходит именно этой специальности (1-2 предложения)",
      "isBestPick": false
    }
  ]
}

Ровно у ОДНОГО университета из списка поставь "isBestPick": true — это твоя главная рекомендация с кратким обоснованием в whyFit.
Опирайся на данные поиска выше, не выдумывай названия университетов, которых там нет, если данных мало — честно используй общеизвестные вузы по теме.
Ответь ТОЛЬКО JSON.`;

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json(extractJson(response.choices[0].message.content, { universities: [] }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate-starter-plan', requireAuth, async (req, res) => {
  const { specialty, university, goal } = req.body;
  const client = requireGroq(res);
  if (!client) return;
  try {
    const prompt = `Составь стартовый план поступления из 8-10 конкретных задач. Ответь ТОЛЬКО JSON.

Цель студента: ${goal || 'не указана'}
Специальность: ${specialty || 'не указана'}
Целевой университет: ${university || 'не указан'}

{
  "items": [
    {
      "title": "Конкретное действие (глагол + что делать)",
      "category": "documents",
      "note": "Зачем это нужно (1 предложение)"
    }
  ]
}

Категории: documents, languages, universities, essays, study, finances, other
Задачи должны покрывать весь путь: документы, языковой экзамен, эссе/мотивационное письмо, подача заявки, поиск стипендий.
Ответь ТОЛЬКО JSON.`;

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json(extractJson(response.choices[0].message.content, { items: [] }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/parse-document', requireAuth, upload.single('document'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Файл не загружен' });

  let text = '';
  try {
    if (file.mimetype === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(file.buffer);
      text = data.text;
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    } else if (file.mimetype === 'text/plain') {
      text = file.buffer.toString('utf-8');
    } else {
      return res.status(400).json({ error: 'Поддерживаются только PDF, DOCX и TXT файлы' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Не удалось прочитать файл: ' + e.message });
  }

  if (!text.trim()) return res.status(400).json({ error: 'В документе не найден текст' });

  const client = requireGroq(res);
  if (!client) return;
  try {
    const truncated = text.slice(0, 8000);
    const prompt = `Из этого документа извлеки конкретные задачи/действия для плана поступления в университет. Ответь ТОЛЬКО JSON.

Текст документа:
${truncated}

{
  "items": [
    {
      "title": "Конкретное действие (глагол + что делать)",
      "category": "documents",
      "note": "Детали, включая даты/дедлайны если они есть в документе"
    }
  ]
}

Категории: documents, languages, universities, essays, study, finances, other
ВАЖНО: если в документе есть даты или дедлайны — переноси их В ТОЧНОСТИ как написано в документе, не меняй числа и месяцы.
Ответь ТОЛЬКО JSON.`;

    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    res.json(extractJson(response.choices[0].message.content, { items: [] }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err?.message?.includes('File too large')) {
    return res.status(400).json({ error: 'Файл слишком большой (максимум 10 МБ)' });
  }
  next(err);
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
