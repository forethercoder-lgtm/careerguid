import React, { useState, useEffect } from 'react';
import IeltsPretest from './IeltsPretest';
import './Ielts.css';

const TARGETS = [
  ['Бакалавр', '6.0–6.5 overall, не ниже 5.5–6.0 за секцию'],
  ['Магистр', '6.5–7.0 overall, не ниже 6.0–6.5 за секцию'],
  ['PhD / топ-вузы', '7.0+, письмо 6.5–7.0'],
];

const CRITERIA = [
  ['Task Response', 'Ответить на ВСЕ части вопроса, ясная позиция, идеи с примерами. Минимум 250 слов.'],
  ['Coherence & Cohesion', 'Один абзац — одна мысль, уместные связки, есть вступление и вывод.'],
  ['Lexical Resource', 'Разнообразная лексика, синонимы вместо повторов, точная сочетаемость.'],
  ['Grammatical Range', 'Разные конструкции (условные, пассив, сложноподчинённые), большинство фраз без ошибок.'],
];

const PLAN = [
  ['Неделя 1', 'Диагностика: 1 полный пробный тест. Разобрать формат всех секций. Завести словарь.'],
  ['Неделя 2', 'Listening (section 1–2), Reading: skimming/scanning, True/False/Not Given.'],
  ['Неделя 3', 'Writing Task 1: язык трендов, 4 эссе по образцу. Speaking Part 1 на диктофон.'],
  ['Неделя 4', 'Writing Task 2: структура, 3 типа вопросов, 3 эссе + самопроверка. 50 тематических коллокаций.'],
  ['Неделя 5', 'Listening (section 3–4), Reading: matching headings. Промежуточный mock (L+R).'],
  ['Неделя 6', 'Writing Task 2: оставшиеся типы, 4 эссе. Speaking Part 2: 10 cue cards с таймером.'],
  ['Неделя 7', 'Полный mock под таймер. Speaking Part 3. Точечно закрыть слабую секцию.'],
  ['Неделя 8', '2 полных mock с проверкой. Повторить словарь и связки. Перед экзаменом — лёгкое повторение.'],
];

const RESOURCES = [
  ['British Council — IELTS Ready (бесплатно)', 'https://takeielts.britishcouncil.org/prepare/ielts-ready'],
  ['Бесплатные пробные тесты + бланки', 'https://takeielts.britishcouncil.org/prepare/ielts-free-practice-mock-tests'],
  ['Writing Band Descriptors (PDF, Cambridge)', 'https://takeielts.britishcouncil.org/sites/default/files/ielts_writing_band_descriptors.pdf'],
  ['Speaking Band Descriptors (PDF)', 'https://takeielts.britishcouncil.org/sites/default/files/ielts_speaking_band_descriptors.pdf'],
  ['IELTS Online Tests (банк практик)', 'https://ieltsonlinetests.com/'],
];

export default function Ielts({ token, userEmail, tasks, setTasks, showNotif, onCancel, onLearn, onReading }) {
  const [mode, setMode] = useState('info'); // info | pretest
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    try {
      const r = localStorage.getItem(`ielts_result_${userEmail}`);
      if (r) setLastResult(JSON.parse(r));
    } catch {}
  }, [userEmail]);

  if (mode === 'pretest') {
    return (
      <IeltsPretest
        token={token}
        userEmail={userEmail}
        tasks={tasks}
        setTasks={setTasks}
        showNotif={showNotif}
        onDone={(result) => { setLastResult(result); setMode('info'); }}
        onCancel={() => setMode('info')}
      />
    );
  }

  return (
    <div className="ielts-page">
      <div className="ielts-header">
        <h2>🗣 Подготовка к IELTS</h2>
        <button className="btn btn-ghost" onClick={onCancel}>← Назад к плану</button>
      </div>

      <div className="ielts-cta card">
        {lastResult ? (
          <>
            <div className="ielts-cta-title">Твой уровень: ~{Number(lastResult.estimatedBand).toFixed(1)} · цель {Number(lastResult.targetBand).toFixed(1)}</div>
            <p className="ielts-hint">Пройдено {lastResult.takenAt}. Пройди тест ещё раз, чтобы обновить прогноз.</p>
          </>
        ) : (
          <>
            <div className="ielts-cta-title">🎯 Не знаешь свой уровень?</div>
            <p className="ielts-hint">Пройди тест на 5 минут — узнаешь примерный балл, поставишь цель и получишь план подготовки.</p>
          </>
        )}
        <button className="btn btn-primary" onClick={() => setMode('pretest')}>
          {lastResult ? 'Пройти тест заново →' : 'Пройти тест уровня →'}
        </button>
      </div>

      <div className="ielts-section card" style={{ cursor: 'pointer' }} onClick={onLearn}>
        <div className="ielts-cta-title">📚 Уроки и материалы</div>
        <p className="ielts-hint" style={{ marginBottom: 0 }}>49 уроков по всем навыкам, банк из 200 эссе, 200 cue cards для Speaking и 71 гайд по поступлению за рубеж →</p>
      </div>

      <div className="ielts-section card" style={{ cursor: 'pointer' }} onClick={onReading}>
        <div className="ielts-cta-title">📖 Reading практика</div>
        <p className="ielts-hint" style={{ marginBottom: 0 }}>5 полных тестов с реальными текстами и автопроверкой — 9 типов заданий, ~200 вопросов →</p>
      </div>

      <Section title="Формат">
        <p className="ielts-p">Listening 30 мин · Reading 60 мин · Writing 60 мин · Speaking 11–14 мин. Каждая секция 1–9, overall — среднее. Результат действует 2 года.</p>
      </Section>

      <Section title="Сколько нужно баллов">
        {TARGETS.map(([k, v]) => (
          <div key={k} className="ielts-row"><span className="ielts-row-k">{k}</span><span className="ielts-row-v">{v}</span></div>
        ))}
        <p className="ielts-note">Точный порог всегда смотри на странице программы.</p>
      </Section>

      <Section title="Writing Task 2 — критерии оценки">
        {CRITERIA.map(([k, v]) => (
          <div key={k} className="ielts-block"><div className="ielts-block-k">{k}</div><p className="ielts-p">{v}</p></div>
        ))}
        <p className="ielts-note">Структура: вступление → тело 1 (мысль + пример) → тело 2 → вывод. 4 абзаца, 260–290 слов.</p>
      </Section>

      <Section title="План на 8 недель">
        {PLAN.map(([k, v]) => (
          <div key={k} className="ielts-block"><div className="ielts-block-k">{k}</div><p className="ielts-p">{v}</p></div>
        ))}
      </Section>

      <Section title="Бесплатные материалы">
        {RESOURCES.map(([label, url]) => (
          <a key={url} className="ielts-link" href={url} target="_blank" rel="noreferrer">🔗 {label}</a>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="ielts-section card">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
