// IELTS pre-test: оценка текущего уровня по отборочному тесту + оценка эссе через Gemini
// + приблизительный расчёт срока до целевого балла.
require('dotenv').config();

const pretestBank = require('./data/ieltsPretest.json');
const ieltsInfo = require('./data/ielts.json');
const lessonsData = require('./data/ieltsLessons.json');
const guidesData = require('./data/studyAbroadGuides.json');
const countryGuidesData = require('./data/countryGuides.json');
const topicGuidesData = require('./data/topicGuides.json');
const vocabLessonsData = require('./data/ieltsVocabLessons.json');

function learningContent() {
  const generalGuides = guidesData.guides.map(g => ({ ...g, type: 'general' }));
  const countryGuides = countryGuidesData.countryGuides.map(g => ({ ...g, type: 'country', title: `Как поступить в ${g.country}` }));
  const topicGuides = topicGuidesData.topicGuides.map(g => ({ ...g, type: 'topic' }));
  return {
    lessons: [...lessonsData.lessons, ...vocabLessonsData.lessons],
    guides: [...generalGuides, ...topicGuides, ...countryGuides],
    practiceBank: ieltsInfo.writingTask2.practiceBank,
    part2Categories: ieltsInfo.speaking.part2Categories,
    part3Sets: ieltsInfo.speaking.part3Sets,
  };
}

// Доверенные домены для живого веб-поиска (Tavily) по вопросам IELTS — используются как
// include_domains, чтобы ИИ-ассистент отвечал на основе реальных, проверенных источников,
// а не выдумывал. Официальные органы + давно существующие, широко известные ресурсы.
const IELTS_DOMAINS = [
  // Официальные организаторы экзамена
  'ielts.org', 'takeielts.britishcouncil.org', 'britishcouncil.org', 'idp.com',
  'cambridgeenglish.org', 'cambridge.org',
  // Бесплатные подготовительные ресурсы (давно существуют, широко известны)
  'ieltsliz.com', 'ielts-simon.com', 'ieltsbuddy.com', 'ieltsonlinetests.com',
  'ieltsadvantage.com', 'examenglish.com', 'ieltsxpress.com', 'ieltsmaterial.com',
  'ieltsfever.com', 'e2language.com', 'magoosh.com', 'ieltspodcast.com', 'mini-ielts.com',
  // Общий английский (грамматика/лексика/произношение)
  'learnenglish.britishcouncil.org', 'bbc.co.uk', 'voanews.com', 'englishclub.com',
  'perfect-english-grammar.com', 'vocabulary.com', 'thesaurus.com', 'merriam-webster.com',
  'dictionary.cambridge.org', 'grammarly.com',
  // Академическое письмо
  'owl.purdue.edu', 'writeandimprove.com',
  // Практика listening/speaking
  'ted.com', 'cambly.com', 'italki.com', 'preply.com',
];

function ieltsRelated(text) {
  return /ielts|айлтс|speaking|writing task|listening|reading (section|passage)|band score|[Бб]анд/i.test(text || '');
}

function publicQuestions() {
  return pretestBank.questions.map(({ answer, ...q }) => q);
}

function scoreObjective(answers = []) {
  const byId = new Map(pretestBank.questions.map(q => [q.id, q]));
  let points = 0;
  let correct = 0;
  const total = pretestBank.questions.length;
  for (const a of answers) {
    const q = byId.get(a.questionId);
    if (!q) continue;
    if (q.answer === a.choice) {
      points += q.points;
      correct += 1;
    }
  }
  const tier = pretestBank.bandTable.find(t => points <= t.maxPoints) || pretestBank.bandTable[pretestBank.bandTable.length - 1];
  return { points, maxPoints: pretestBank.maxPoints, correct, total, band: tier.band };
}

function requireGemini() {
  if (!process.env.GEMINI_API_KEY) return null;
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3.8-flash' });
}

function extractJson(text, fallback) {
  const cleaned = String(text || '').trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try { return JSON.parse(cleaned); }
  catch { const m = cleaned.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : fallback; }
}

/** Оценить эссе (Writing Task 2) через Gemini по официальным критериям (band descriptors пересказаны в data/ielts.json). Возвращает null, если GEMINI_API_KEY не настроен — тогда используется только объективный тест. */
async function evaluateWriting(text, prompt) {
  const model = requireGemini();
  if (!model) return null;
  const truncated = String(text || '').slice(0, 6000);
  const wordCount = truncated.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 40) return { band: null, wordCount, feedback: 'Слишком короткий текст для оценки — напиши минимум 150–250 слов.' };

  const criteria = ieltsInfo.writingTask2.criteria;
  const req = `Ты — сертифицированный экзаменатор IELTS Writing Task 2. Оцени эссе студента по 4 официальным критериям (шкала 1-9, шаг 0.5): Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy. Определения критериев:
${Object.entries(criteria).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

Тема эссе: ${prompt || '(не указана)'}

Текст эссе студента (${wordCount} слов):
"""
${truncated}
"""

Ответь ТОЛЬКО JSON в таком формате:
{
  "taskResponse": 6.5,
  "coherenceCohesion": 6.0,
  "lexicalResource": 6.5,
  "grammar": 6.0,
  "overallBand": 6.0,
  "strengths": ["конкретная сильная сторона 1", "сильная сторона 2"],
  "improvements": ["конкретное предложение по улучшению 1", "предложение 2"]
}
overallBand — среднее четырёх критериев, округлённое до ближайших 0.5.
Комментарии (strengths/improvements) пиши строго на русском языке. Ключи JSON не переводи.
Ответь ТОЛЬКО JSON.`;

  try {
    const result = await model.generateContent(req);
    const data = extractJson(result.response.text(), null);
    if (!data) return null;
    return { ...data, wordCount };
  } catch (e) {
    console.warn('Gemini writing evaluation error:', e.message);
    return null;
  }
}

// Приблизительная оценка часов подготовки на 0.5 балла — широко используемая на рынке
// прикидка (British Council / школы IELTS ориентируются на ~100-150 часов сфокусированной
// подготовки на каждые 0.5 балла для мотивированного студента). Это НЕ официальная гарантия.
const HOURS_PER_HALF_BAND_LOW = 80;
const HOURS_PER_HALF_BAND_HIGH = 150;

function estimateTimeline(currentBand, targetBand, hoursPerWeek = 5) {
  const gapSteps = Math.max(0, Math.round((targetBand - currentBand) / 0.5));
  if (gapSteps === 0) {
    return { gapSteps: 0, hoursLow: 0, hoursHigh: 0, weeksLow: 0, weeksHigh: 0, message: 'Цель уже примерно соответствует текущему уровню — можно сразу переходить к закреплению и пробным тестам.' };
  }
  const hoursLow = gapSteps * HOURS_PER_HALF_BAND_LOW;
  const hoursHigh = gapSteps * HOURS_PER_HALF_BAND_HIGH;
  const hpw = Math.max(1, hoursPerWeek);
  const weeksLow = Math.ceil(hoursLow / hpw);
  const weeksHigh = Math.ceil(hoursHigh / hpw);
  return { gapSteps, hoursLow, hoursHigh, weeksLow, weeksHigh };
}

/** Растянуть/сжать существующий 8-недельный план на нужное число недель (грубое масштабирование). */
function scaleStudyPlan(weeks) {
  const base = ieltsInfo.studyPlan8Weeks;
  if (weeks <= 0) return [];
  if (weeks === base.length) return base;
  const out = [];
  for (let w = 1; w <= weeks; w++) {
    const srcIdx = Math.min(base.length - 1, Math.floor(((w - 1) / weeks) * base.length));
    out.push({ week: String(w), focus: base[srcIdx].focus });
  }
  return out;
}

module.exports = { publicQuestions, scoreObjective, evaluateWriting, estimateTimeline, scaleStudyPlan, ieltsRelated, IELTS_DOMAINS, learningContent, geminiEnabled: !!process.env.GEMINI_API_KEY };
