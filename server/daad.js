// DAAD "International Programmes in Germany" — англоязычные программы вузов Германии.
// Открытый JSON, без ключа. tuition / дедлайны / язык / город.
// Источник: www2.daad.de/deutschland/studienangebote/international-programmes/

const BASE = 'https://www2.daad.de/deutschland/studienangebote/international-programmes/api/solr/en/search.json';
const SITE = 'https://www2.daad.de';

// courseType в ответе DAAD (эмпирически): 1 Bachelor, 2 Master, 3 PhD, 4 язык/короткие, 5 подготовительные
const TYPE = { bachelor: 1, master: 2, phd: 3 };

const cache = new Map();
const TTL = 12 * 60 * 60 * 1000;

const clean = s => (s || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null;

function shape(c) {
  return {
    name: clean(c.courseName),
    university: clean(c.academy),
    city: c.city,
    languages: c.languages,
    tuition: clean(c.tuitionFees || c.costString),
    deadline: clean(c.applicationDeadline),
    courseType: c.courseType ?? null,
    elearning: !!c.isElearning,
    scholarship: !!c.financialSupport,
    link: c.link ? SITE + c.link : null,
  };
}

/**
 * Поиск программ. opts: { query, level: 'bachelor'|'master'|'phd', limit }
 * level фильтруется по courseType на нашей стороне (API-таксономия нестабильна).
 */
async function search({ query = '', level, limit = 10 } = {}) {
  const key = `${query}|${level}|${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;

  const url = `${BASE}?q=${encodeURIComponent(query)}&limit=40&offset=0&sort=name`;
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) { console.warn('DAAD', res.status); return []; }
    const json = await res.json();
    let list = (json.courses || []).map(shape);
    if (level && TYPE[level]) list = list.filter(c => c.courseType === TYPE[level]);
    list = list.slice(0, limit);
    cache.set(key, { at: Date.now(), data: list });
    return list;
  } catch (e) {
    console.warn('DAAD error:', e.message);
    return [];
  }
}

/** Строка для промпта LLM */
function asPromptContext(list) {
  return list.map(c => {
    const bits = [`${c.name} — ${c.university}, ${c.city}`];
    if (c.tuition) bits.push(c.tuition);
    if (c.deadline) bits.push(`дедлайн: ${c.deadline}`);
    if (c.scholarship) bits.push('есть финансирование');
    return '- ' + bits.join(' | ');
  }).join('\n');
}

module.exports = { search, asPromptContext };
