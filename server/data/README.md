# server/data — справочные данные для AI-ориентации

## universities.json
Справочник вузов мира: `{ name, country, cc, region, site }` — 10 259 вузов, 201 страна.
Источник: [Hipolabs](https://github.com/Hipo/university-domains-list) (открытый, community-maintained, без ключа).

### Как обновить (раз в год достаточно)
```bash
cd server/data
curl -sL -o _raw.json https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json
node -e "const d=require('./_raw.json');const s=d.map(u=>({name:u.name,country:u.country,cc:u.alpha_two_code,region:u['state-province']||null,site:(u.web_pages||[])[0]||null})).sort((a,b)=>a.country.localeCompare(b.country)||a.name.localeCompare(b.name));require('fs').writeFileSync('./universities.json',JSON.stringify(s));console.log('ok',s.length)"
rm _raw.json
```

### Как использовать в коде
```js
const U = require('./universities');           // из server/index.js
U.byCountries(['🇩🇪 Германия', 'Netherlands']); // → массив вузов (RU/EN, с флагами или без)
U.search('freiburg');                           // → поиск по названию
U.asPromptContext(list);                        // → "Название — Страна" построчно для промпта LLM
```

## Данные вузов США — College Scorecard (`server/scorecard.js`)
tuition, % приёма, средний SAT/ACT, размер, зарплаты выпускников через 10 лет.
Бесплатный ключ: https://api.data.gov/signup/ → положить в `SCORECARD_API_KEY` (env).
Для теста работает `SCORECARD_API_KEY=DEMO_KEY` (низкий лимит).

```js
const SC = require('./scorecard');
await SC.byName('Harvard University');          // → [{ admissionRate:4, satAverage:1553, tuitionOutOfState:61676, ... }]
await SC.enrich(['Stanford University', 'MIT']); // обогатить список названий
SC.asPromptContext(list);                        // строка для промпта LLM
```

## Программы Германии — DAAD (`server/daad.js`)
Англоязычные программы вузов Германии: tuition, дедлайн, язык, город, ссылка.
Открытый JSON, **без ключа**. Германия — одна из топ-стран в опросе предпочтений.

```js
const DAAD = require('./daad');
await DAAD.search({ query: 'mechanical engineering', level: 'master', limit: 8 });
DAAD.asPromptContext(list);   // строка для промпта LLM
```

## IELTS — материалы для подготовки (`server/data/ielts.json`)
Формат экзамена, пороги вузов, критерии и дескрипторы Writing/Speaking (band 5–8),
типы заданий, банк практических тем, 8-недельный план, бесплатные ресурсы.
Использовать: в промпте `/api/essay-feedback` (калибровка оценки по дескрипторам)
и при генерации задач подготовки к языку в плане.

```js
const IELTS = require('./data/ielts.json');
IELTS.writingTask2.bandGuide['7'];        // что нужно для band 7
IELTS.studyPlan8Weeks;                    // готовый план
IELTS.writingTask2.practicePrompts;       // темы для тренировки
```

## Чего ещё НЕТ (и откуда брать)
| Данные | Источник | Статус |
|---|---|---|
| Рейтинги QS | Kaggle CSV → `rankings.json` | ⬜ не добавлено |
| Программы США (tuition, % приёма, SAT) | College Scorecard (`scorecard.js`) | ✅ модуль готов, нужен ключ в env |
| Программы Германии | DAAD (`daad.js`) | ✅ работает без ключа |
| Программы UK | HESA Discover Uni (bulk CSV/XML) | ⬜ не добавлено |
| Программы прочих стран | Tavily live-поиск (уже в `/api/suggest-universities`) | ✅ работает |
| Стипендии | вручную топ-20 → `scholarships.json` + Tavily | ⬜ частично (Tavily) |
| Studyportals / ScholarshipPortal | только платный B2B-API, скрейп против ToS | ❌ не использовать |
| IELTS подготовка | `data/ielts.json` | ✅ добавлено |
