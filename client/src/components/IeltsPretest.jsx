import React, { useState, useEffect } from 'react';
import { apiIeltsPretest, apiIeltsSubmit } from '../api';
import './Ielts.css';

const WRITING_PROMPTS = [
  'Some people think university education should be free for everyone. To what extent do you agree or disagree?',
  'Many young people leave their home country to work abroad. Discuss the advantages and disadvantages.',
  'Online learning is becoming more common. Do the benefits outweigh the drawbacks?',
  'In many cities traffic and pollution are serious problems. What causes this and what solutions can you suggest?',
];

const TARGET_BANDS = [5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5];
const HOURS_OPTIONS = [
  { v: 3, label: '~3 ч/нед' },
  { v: 5, label: '~5 ч/нед' },
  { v: 10, label: '~10 ч/нед' },
  { v: 15, label: '15+ ч/нед' },
];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function IeltsPretest({ token, userEmail, tasks, setTasks, showNotif, onDone, onCancel }) {
  const [step, setStep] = useState('intro'); // intro | quiz | writing | goal | result
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [writingPrompt] = useState(WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)]);
  const [writingText, setWritingText] = useState('');
  const [targetBand, setTargetBand] = useState(7.0);
  const [hoursPerWeek, setHoursPerWeek] = useState(5);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (step !== 'quiz' || questions.length > 0) return;
    setLoadingQuestions(true);
    apiIeltsPretest(token)
      .then(data => setQuestions(data.questions || []))
      .catch(e => setError(e.message))
      .finally(() => setLoadingQuestions(false));
  }, [step]);

  function pickAnswer(choiceIdx) {
    const q = questions[qIndex];
    setAnswers(a => ({ ...a, [q.id]: choiceIdx }));
    setTimeout(() => {
      if (qIndex < questions.length - 1) setQIndex(i => i + 1);
      else setStep('writing');
    }, 150);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiIeltsSubmit(token, {
        answers: Object.entries(answers).map(([questionId, choice]) => ({ questionId, choice })),
        writingText: writingText.trim() || undefined,
        writingPrompt,
        targetBand,
        hoursPerWeek,
      });
      setResult(data);
      const saved = { ...data, takenAt: todayStr() };
      try { localStorage.setItem(`ielts_result_${userEmail}`, JSON.stringify(saved)); } catch {}
      setStep('result');
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  }

  function addPlanToTasks() {
    if (!result?.studyPlan?.length) return;
    const items = result.studyPlan.map((w, i) => ({
      id: Date.now() + i,
      title: `IELTS — неделя ${w.week}: ${w.focus.split('.')[0]}`,
      cat: '🗣 Языки',
      note: w.focus,
      origin: 'plan',
      done: false,
      createdAt: todayStr(),
    }));
    setTasks(existing => [...existing, ...items.filter(nt => !existing.some(e => e.title === nt.title))]);
    setAdded(true);
    showNotif?.('✅ План подготовки добавлен в задачи');
  }

  return (
    <div className="ielts-page">
      <div className="ielts-header">
        <h2>🎯 Тест уровня IELTS</h2>
        <button className="btn btn-ghost" onClick={() => (step === 'intro' ? onCancel() : setStep('intro'))}>← Назад</button>
      </div>

      {step === 'intro' && (
        <div className="card ielts-cta">
          <div className="ielts-cta-title">Узнай свой примерный уровень</div>
          <p className="ielts-hint">
            Короткий тест (~5 минут): 18 вопросов на грамматику и лексику + необязательное эссе.
            Дальше укажешь желаемый балл — получишь прикидку срока подготовки и план, который можно
            сразу добавить в свои задачи.
          </p>
          <p className="ielts-note">
            Это не официальный результат IELTS — только ориентир. Для точной оценки пройди бесплатный
            мок-тест British Council (ссылки — на предыдущем экране).
          </p>
          <button className="btn btn-primary" onClick={() => setStep('quiz')}>Начать тест →</button>
        </div>
      )}

      {step === 'quiz' && (
        loadingQuestions ? (
          <div className="ielts-loading"><span className="spinner" /> Загружаю вопросы...</div>
        ) : questions.length === 0 ? (
          <p className="ielts-error">{error || 'Вопросы не загрузились'}</p>
        ) : (
          <div className="card">
            <div className="ielts-step-label">Вопрос {qIndex + 1} / {questions.length}</div>
            <div className="ielts-progress-track"><div className="ielts-progress-fill" style={{ width: `${((qIndex + 1) / questions.length) * 100}%` }} /></div>
            {questions[qIndex].passage && (
              <div className="ielts-passage">{questions[qIndex].passage}</div>
            )}
            <div className="ielts-question">{questions[qIndex].prompt}</div>
            <div className="radio-list">
              {questions[qIndex].options.map((opt, i) => (
                <button
                  key={i}
                  className={`radio-btn ${answers[questions[qIndex].id] === i ? 'selected' : ''}`}
                  onClick={() => pickAnswer(i)}
                >
                  <div className="radio-circle">{answers[questions[qIndex].id] === i ? '●' : ''}</div>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {step === 'writing' && (
        <div className="card">
          <div className="ielts-question">Writing Task 2 (необязательно)</div>
          <p className="ielts-hint">Если напишешь короткое эссе (от 150 слов), ИИ оценит его по официальным критериям — прикидка будет точнее.</p>
          <div className="ielts-passage">{writingPrompt}</div>
          <textarea
            className="ielts-textarea"
            rows={8}
            value={writingText}
            onChange={e => setWritingText(e.target.value)}
            placeholder="Напиши эссе здесь (можно пропустить)..."
          />
          <div className="ielts-wordcount">{writingText.trim() ? writingText.trim().split(/\s+/).length : 0} слов</div>
          <button className="btn btn-primary" onClick={() => setStep('goal')}>
            {writingText.trim() ? 'Далее →' : 'Пропустить →'}
          </button>
        </div>
      )}

      {step === 'goal' && (
        <div className="card">
          <div className="ielts-question">Какой балл — твоя цель?</div>
          <div className="chips-grid">
            {TARGET_BANDS.map(b => (
              <button key={b} className={`chip ${targetBand === b ? 'selected' : ''}`} onClick={() => setTargetBand(b)}>{b.toFixed(1)}</button>
            ))}
          </div>

          <div className="ielts-question" style={{ marginTop: 22 }}>Сколько часов в неделю готов уделять?</div>
          <div className="chips-grid">
            {HOURS_OPTIONS.map(h => (
              <button key={h.v} className={`chip ${hoursPerWeek === h.v ? 'selected' : ''}`} onClick={() => setHoursPerWeek(h.v)}>{h.label}</button>
            ))}
          </div>

          {error && <p className="ielts-error">{error}</p>}
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={submit} disabled={submitting}>
            {submitting ? <><span className="spinner" /> Считаю результат...</> : 'Показать результат →'}
          </button>
        </div>
      )}

      {step === 'result' && result && (
        <>
          <div className="card">
            <h2 style={{ marginBottom: 6 }}>📊 Твой примерный уровень: {result.estimatedBand.toFixed(1)}</h2>
            <p className="ielts-hint">Цель: {result.targetBand.toFixed(1)}</p>
          </div>

          <div className="card ielts-section">
            <p className="ielts-result-row">✅ Правильных ответов: {result.objective.correct} / {result.objective.total}</p>
            {result.writing?.overallBand != null && (
              <>
                <p className="ielts-result-row">✍️ Эссе (ИИ-оценка): {result.writing.overallBand.toFixed(1)}</p>
                {result.writing.strengths?.map((str, i) => <p key={'s' + i} className="ielts-result-sub">+ {str}</p>)}
                {result.writing.improvements?.map((str, i) => <p key={'i' + i} className="ielts-result-sub">→ {str}</p>)}
              </>
            )}
            {result.writing?.feedback && !result.writing.overallBand && (
              <p className="ielts-result-sub">{result.writing.feedback}</p>
            )}
          </div>

          <div className="card ielts-section">
            <h3>⏱ Сколько нужно времени</h3>
            {result.timeline.gapSteps === 0 ? (
              <p className="ielts-result-row">{result.timeline.message}</p>
            ) : (
              <p className="ielts-result-row">
                Примерно {result.timeline.weeksLow}–{result.timeline.weeksHigh} недель
                {' '}(≈{Math.round(result.timeline.weeksLow / 4.3)}–{Math.round(result.timeline.weeksHigh / 4.3)} мес.)
                {' '}при {hoursPerWeek} ч/нед.
              </p>
            )}
            <p className="ielts-note">Это грубая рыночная прикидка (не официальная гарантия IELTS) — реальный темп зависит от твоего старта и регулярности занятий.</p>
          </div>

          {result.studyPlan?.length > 0 && (
            <button className="btn btn-primary" onClick={addPlanToTasks} disabled={added}>
              {added ? 'План добавлен ✓' : `Добавить план (${result.studyPlan.length} нед.) в мои задачи`}
            </button>
          )}

          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => onDone(result)}>Готово</button>
        </>
      )}
    </div>
  );
}
