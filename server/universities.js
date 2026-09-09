// Справочник вузов мира (источник: Hipolabs, github.com/Hipo/university-domains-list)
// Обновление: см. server/data/README.md
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'data', 'universities.json');

let ALL = [];
try {
  ALL = JSON.parse(fs.readFileSync(FILE, 'utf8'));
} catch (e) {
  console.warn('⚠️  server/data/universities.json не найден — справочник вузов пуст');
}

const norm = s => (s || '').toString().trim().toLowerCase();

// Синонимы названий стран (RU и частые варианты EN → как в датасете)
const COUNTRY_ALIASES = {
  'германия': 'Germany', 'канада': 'Canada', 'нидерланды': 'Netherlands',
  'голландия': 'Netherlands', 'великобритания': 'United Kingdom', 'англия': 'United Kingdom',
  'сша': 'United States', 'америка': 'United States', 'usa': 'United States',
  'австралия': 'Australia', 'швеция': 'Sweden', 'чехия': 'Czech Republic',
  'финляндия': 'Finland', 'япония': 'Japan', 'франция': 'France', 'италия': 'Italy',
  'испания': 'Spain', 'польша': 'Poland', 'австрия': 'Austria', 'швейцария': 'Switzerland',
  'ирландия': 'Ireland', 'норвегия': 'Norway', 'дания': 'Denmark', 'бельгия': 'Belgium',
  'южная корея': 'South Korea', 'корея': 'South Korea', 'сингапур': 'Singapore',
  'оаэ': 'United Arab Emirates', 'турция': 'Turkey', 'казахстан': 'Kazakhstan',
  'россия': 'Russian Federation',
};

function resolveCountry(input) {
  const raw = (input || '').replace(/[^\p{L}\s]/gu, '').trim(); // убрать флаг-эмодзи
  return COUNTRY_ALIASES[norm(raw)] || raw;
}

/** Все вузы одной страны */
function byCountry(country) {
  const target = norm(resolveCountry(country));
  return ALL.filter(u => norm(u.country) === target);
}

/** Вузы по списку стран (принимает RU/EN названия, с эмодзи-флагами или без) */
function byCountries(countries = []) {
  const targets = new Set(countries.map(c => norm(resolveCountry(c))));
  return ALL.filter(u => targets.has(norm(u.country)));
}

/** Поиск по подстроке в названии (для targetSchool / вуза мечты) */
function search(query, limit = 10) {
  const q = norm(query);
  if (!q) return [];
  return ALL.filter(u => norm(u.name).includes(q)).slice(0, limit);
}

/** Компактный контекст для промпта LLM: "Название — Страна" построчно */
function asPromptContext(list, max = 60) {
  return list.slice(0, max).map(u => `${u.name} — ${u.country}`).join('\n');
}

module.exports = { ALL, byCountry, byCountries, search, asPromptContext, resolveCountry };
