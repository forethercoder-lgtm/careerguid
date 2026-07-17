import React, { useState } from 'react';
import './PreferencesSetup.css';

const COUNTRIES = ['🇩🇪 Германия', '🇨🇦 Канада', '🇳🇱 Нидерланды', '🇬🇧 Великобритания', '🇺🇸 США', '🇦🇺 Австралия', '🇸🇪 Швеция', '🇨🇿 Чехия', '🇫🇮 Финляндия', '🇯🇵 Япония'];
const INTERESTS = ['💻 IT и программирование', '💼 Бизнес и менеджмент', '🎨 Дизайн и искусство', '⚕️ Медицина', '⚙️ Инженерия', '🔬 Науки', '📚 Гуманитарные науки', '⚖️ Право', '🌱 Экология', '🎬 Медиа и кино'];
const BUDGETS = ['До $10,000/год', '$10,000–20,000/год', '$20,000–30,000/год', 'Выше $30,000/год', 'Ищу стипендии и гранты'];
const LEVELS = ['Бакалавр (Bachelor)', 'Магистр (Master)', 'PhD / Докторантура'];
const STRATEGIES = [
  { id: 'reach', label: '🚀 Амбициозная', desc: 'Топовые университеты, высокая конкуренция' },
  { id: 'balanced', label: '⚖️ Сбалансированная', desc: 'Реальные шансы поступить' },
  { id: 'safe', label: '🛡 Надёжная', desc: 'Высокие шансы на успех' },
];

const STEPS = ['Страны', 'Интересы', 'Бюджет', 'Образование', 'Цель', 'Стратегия', 'Университет', 'Геолокация'];

export default function PreferencesSetup({ user, onDone }) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState({
    countries: [],
    interests: [],
    budget: '',
    educationLevel: '',
    goal: '',
    strategy: '',
    targetSchool: '',
    location: null,
  });
  const [geoStatus, setGeoStatus] = useState('idle'); // idle | requesting | granted | denied
  const [manualCity, setManualCity] = useState('');

  function toggleMulti(key, val) {
    setPrefs(p => ({
      ...p,
      [key]: p[key].includes(val) ? p[key].filter(v => v !== val) : [...p[key], val]
    }));
  }

  function setSingle(key, val) {
    setPrefs(p => ({ ...p, [key]: val }));
  }

  function requestLocation() {
    if (!navigator.geolocation) { setGeoStatus('denied'); return; }
    setGeoStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPrefs(p => ({ ...p, location: { lat: pos.coords.latitude, lon: pos.coords.longitude } }));
        setGeoStatus('granted');
      },
      () => setGeoStatus('denied'),
      { timeout: 10000 }
    );
  }

  function canNext() {
    if (step === 0) return prefs.countries.length > 0;
    if (step === 1) return prefs.interests.length > 0;
    if (step === 2) return !!prefs.budget;
    if (step === 3) return !!prefs.educationLevel;
    if (step === 4) return prefs.goal.trim().length > 0;
    if (step === 5) return !!prefs.strategy;
    return true;
  }

  function finish() {
    const location = prefs.location || (manualCity.trim() ? { manualCity: manualCity.trim() } : null);
    onDone({ ...prefs, location });
  }

  return (
    <div className="prefs-page">
      <div className="prefs-card">
        <div className="prefs-header">
          <div className="prefs-greeting">Привет! 👋</div>
          <h2>Расскажи о себе</h2>
          <p>Это поможет ИИ-агенту лучше понять тебя с первых слов</p>
        </div>

        <div className="prefs-progress">
          {STEPS.map((s, i) => (
            <div key={i} className={`prefs-step ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}>
              <div className="prefs-dot">{i < step ? '✓' : i + 1}</div>
              <span>{s}</span>
            </div>
          ))}
        </div>

        <div className="prefs-body">
          {step === 0 && (
            <>
              <div className="prefs-question">Какие страны рассматриваешь для учёбы?</div>
              <div className="prefs-hint">Можно выбрать несколько</div>
              <div className="chips-grid">
                {COUNTRIES.map(c => (
                  <button
                    key={c}
                    className={`chip ${prefs.countries.includes(c) ? 'selected' : ''}`}
                    onClick={() => toggleMulti('countries', c)}
                  >{c}</button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="prefs-question">Что тебя больше всего интересует?</div>
              <div className="prefs-hint">Выбери 1–3 направления</div>
              <div className="chips-grid">
                {INTERESTS.map(i => (
                  <button
                    key={i}
                    className={`chip ${prefs.interests.includes(i) ? 'selected' : ''}`}
                    onClick={() => toggleMulti('interests', i)}
                  >{i}</button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="prefs-question">Какой бюджет на обучение?</div>
              <div className="prefs-hint">Стоимость в год, включая проживание</div>
              <div className="radio-list">
                {BUDGETS.map(b => (
                  <button
                    key={b}
                    className={`radio-btn ${prefs.budget === b ? 'selected' : ''}`}
                    onClick={() => setSingle('budget', b)}
                  >
                    <div className="radio-circle">{prefs.budget === b ? '●' : ''}</div>
                    {b}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="prefs-question">Какой уровень программы ищешь?</div>
              <div className="prefs-hint">После какого образования поступаешь</div>
              <div className="radio-list">
                {LEVELS.map(l => (
                  <button
                    key={l}
                    className={`radio-btn ${prefs.educationLevel === l ? 'selected' : ''}`}
                    onClick={() => setSingle('educationLevel', l)}
                  >
                    <div className="radio-circle">{prefs.educationLevel === l ? '●' : ''}</div>
                    {l}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="prefs-question">Расскажи о своей цели</div>
              <div className="prefs-hint">Куда хочешь поступить и зачем — своими словами</div>
              <textarea
                className="prefs-textarea"
                rows={5}
                value={prefs.goal}
                onChange={e => setSingle('goal', e.target.value)}
                placeholder="Например: хочу поступить на Computer Science в Германии, чтобы стать разработчиком..."
              />
            </>
          )}

          {step === 5 && (
            <>
              <div className="prefs-question">Какая у тебя стратегия поступления?</div>
              <div className="prefs-hint">Это поможет понять, какие цели ты перед собой ставишь</div>
              <div className="radio-list">
                {STRATEGIES.map(s => (
                  <button
                    key={s.id}
                    className={`radio-btn ${prefs.strategy === s.id ? 'selected' : ''}`}
                    onClick={() => setSingle('strategy', s.id)}
                  >
                    <div className="radio-circle">{prefs.strategy === s.id ? '●' : ''}</div>
                    <div>
                      <div>{s.label}</div>
                      <div className="prefs-hint" style={{ marginBottom: 0 }}>{s.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <div className="prefs-question">Уже есть университет или колледж на примете?</div>
              <div className="prefs-hint">Необязательно — можно пропустить</div>
              <input
                className="prefs-textinput"
                value={prefs.targetSchool}
                onChange={e => setSingle('targetSchool', e.target.value)}
                placeholder="Например: TU Munich"
              />
            </>
          )}

          {step === 7 && (
            <>
              <div className="prefs-question">Разреши доступ к геолокации</div>
              <div className="prefs-hint">Так ИИ сможет подсказывать курсы и места рядом с тобой</div>
              {geoStatus !== 'granted' && (
                <button className="btn btn-primary" onClick={requestLocation} disabled={geoStatus === 'requesting'}>
                  {geoStatus === 'requesting' ? 'Определяю...' : '📍 Разрешить геолокацию'}
                </button>
              )}
              {geoStatus === 'granted' && <div className="prefs-question">✅ Местоположение определено</div>}
              {geoStatus === 'denied' && (
                <div style={{ marginTop: 16 }}>
                  <div className="prefs-hint">Доступ не получен — можешь ввести город вручную (необязательно)</div>
                  <input
                    className="prefs-textinput"
                    value={manualCity}
                    onChange={e => setManualCity(e.target.value)}
                    placeholder="Например: Алматы"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="prefs-actions">
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>
              ← Назад
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
            >
              Далее →
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={finish}
              disabled={!canNext() || loading}
            >
              {loading ? <><span className="spinner" /> Сохраняю...</> : 'Готово! Начать →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
