// College Scorecard (Минобр США) — tuition, % приёма, SAT, размер, зарплаты выпускников.
// Только вузы США. Бесплатный ключ: https://api.data.gov/signup/  → env SCORECARD_API_KEY
require('dotenv').config();

const KEY = process.env.SCORECARD_API_KEY || process.env.DATA_GOV_API_KEY;
const BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools';

// Поля, которые реально нужны для оценки шансов и стоимости
const FIELDS = [
  'id',
  'school.name',
  'school.city',
  'school.state',
  'school.school_url',
  'latest.student.size',
  'latest.admissions.admission_rate.overall',
  'latest.admissions.sat_scores.average.overall',
  'latest.admissions.act_scores.midpoint.cumulative',
  'latest.cost.tuition.in_state',
  'latest.cost.tuition.out_of_state',
  'latest.cost.avg_net_price.overall',
  'latest.earnings.10_yrs_after_entry.median',
].join(',');

const cache = new Map(); // key -> { at, data }
const TTL = 24 * 60 * 60 * 1000; // сутки

function shape(r) {
  if (!r) return null;
  const pct = r['latest.admissions.admission_rate.overall'];
  return {
    id: r.id,
    name: r['school.name'],
    city: r['school.city'],
    state: r['school.state'],
    site: r['school.school_url'] || null,
    students: r['latest.student.size'] ?? null,
    admissionRate: pct != null ? Math.round(pct * 100) : null,       // %
    satAverage: r['latest.admissions.sat_scores.average.overall'] ?? null,
    actMidpoint: r['latest.admissions.act_scores.midpoint.cumulative'] ?? null,
    tuitionInState: r['latest.cost.tuition.in_state'] ?? null,        // $/год
    tuitionOutOfState: r['latest.cost.tuition.out_of_state'] ?? null, // $/год (для иностранцев ориентир)
    avgNetPrice: r['latest.cost.avg_net_price.overall'] ?? null,
    medianEarnings10y: r['latest.earnings.10_yrs_after_entry.median'] ?? null,
  };
}

async function call(params) {
  if (!KEY) return [];
  const url = `${BASE}?api_key=${KEY}&fields=${FIELDS}&${params}`;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.warn('Scorecard', res.status); return []; }
    const json = await res.json();
    const data = (json.results || []).map(shape).filter(Boolean);
    cache.set(url, { at: Date.now(), data });
    return data;
  } catch (e) {
    console.warn('Scorecard error:', e.message);
    return [];
  }
}

/** Точный/частичный поиск по названию вуза */
function byName(name, perPage = 5) {
  return call(`school.name=${encodeURIComponent(name)}&per_page=${perPage}`);
}

/** Все вузы штата (page с 0) */
function byState(state, page = 0, perPage = 20) {
  return call(`school.state=${encodeURIComponent(state)}&per_page=${perPage}&page=${page}`);
}

/** Обогатить список названий данными Scorecard. names: string[] → shaped[] (без null) */
async function enrich(names = []) {
  const out = [];
  for (const n of names.slice(0, 8)) {
    const [best] = await byName(n, 1);
    if (best) out.push(best);
  }
  return out;
}

/** Строка для промпта LLM */
function asPromptContext(list) {
  return list.map(u => {
    const bits = [`${u.name} (${u.city}, ${u.state})`];
    if (u.admissionRate != null) bits.push(`приём ${u.admissionRate}%`);
    if (u.satAverage) bits.push(`SAT ~${u.satAverage}`);
    if (u.tuitionOutOfState) bits.push(`tuition $${u.tuitionOutOfState}/год`);
    if (u.medianEarnings10y) bits.push(`зарплата через 10 лет $${u.medianEarnings10y}`);
    return '- ' + bits.join(', ');
  }).join('\n');
}

const enabled = !!KEY;

module.exports = { byName, byState, enrich, asPromptContext, enabled };
