import React, { useState, useEffect } from 'react';
import { API_BASE } from '../api';
import { apiListeningTests, apiListeningTest, apiListeningSubmit } from '../api';
import './ReadingPractice.css';

export default function ListeningPractice({ token, onCancel }) {
  const [step, setStep] = useState('list'); // list | section | result
  const [tests, setTests] = useState(null);
  const [test, setTest] = useState(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiListeningTests(token).then(setTests).catch(() => setError('Не удалось загрузить тесты')).finally(() => setLoading(false));
  }, [token]);

  async function pickTest(t) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiListeningTest(token, t.id);
      setTest(data);
      setSectionIndex(0);
      setAnswers({});
      setStep('section');
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function setAnswer(itemId, value) {
    setAnswers(a => ({ ...a, [itemId]: value }));
  }

  async function submit() {
    setSubmitting(true);
    try {
      const data = await apiListeningSubmit(token, test.id, Object.entries(answers).map(([itemId, value]) => ({ itemId, value })));
      setResult(data);
      setStep('result');
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  }

  const section = test?.sections?.[sectionIndex];

  return (
    <div className="reading-page">
      <div className="reading-header">
        <h2>🎧 Listening практика</h2>
        <button className="btn btn-ghost" onClick={() => (step === 'list' ? onCancel() : setStep('list'))}>← Назад</button>
      </div>

      {step === 'list' && (
        <>
          <p className="reading-hint">Реальное аудио с текстами и вопросами, с автопроверкой.</p>
          {loading && <div className="reading-loading">Загружаю...</div>}
          {error && <p className="reading-error">{error}</p>}
          {(tests || []).map(t => (
            <div key={t.id} className="reading-card" onClick={() => pickTest(t)}>
              <div className="reading-card-title">{t.title}</div>
              <div className="reading-card-meta">{t.sections.length} {t.sections.length === 1 ? 'секция' : 'секции'} · {t.sections.reduce((n, sec) => n + sec.itemCount, 0)} вопросов</div>
            </div>
          ))}
        </>
      )}

      {step === 'section' && section && (
        <>
          <div className="reading-step-label">Секция {sectionIndex + 1} / {test.sections.length}</div>
          <div className="reading-progress-track"><div className="reading-progress-fill" style={{ width: `${((sectionIndex + 1) / test.sections.length) * 100}%` }} /></div>

          <h3 className="reading-passage-title">{section.title}</h3>
          <audio key={section.audioUrl} controls style={{ width: '100%', marginBottom: 20 }} src={`${API_BASE}${section.audioUrl}`}>
            Ваш браузер не поддерживает аудио.
          </audio>

          {section.groups.map((g, gi) => (
            <div key={gi} className="reading-group">
              <div className="reading-instructions">{g.instructions}</div>
              {g.items.map(item => (
                <div key={item.id} className="reading-item">
                  <div className="reading-item-prompt">{item.prompt}</div>
                  {item.kind === 'choice' ? (
                    <div className="reading-options">
                      {item.options.map((opt, oi) => (
                        <button key={oi} className={`reading-option ${answers[item.id] === opt ? 'selected' : ''}`} onClick={() => setAnswer(item.id, opt)}>{opt}</button>
                      ))}
                    </div>
                  ) : (
                    <input
                      className="reading-text-input"
                      value={answers[item.id] || ''}
                      onChange={e => setAnswer(item.id, e.target.value)}
                      placeholder="Твой ответ..."
                    />
                  )}
                </div>
              ))}
            </div>
          ))}

          {sectionIndex < test.sections.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setSectionIndex(i => i + 1)}>Следующая секция →</button>
          ) : (
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Проверяю...' : 'Завершить и проверить →'}</button>
          )}
        </>
      )}

      {step === 'result' && result && (
        <>
          <div className="reading-score">✅ {result.correct} / {result.total} правильных</div>
          <p className="reading-hint">Это не официальный балл IELTS. Ниже разбор по каждому вопросу.</p>
          {result.details.map((d, i) => (
            <div key={i} className={`reading-review ${d.correct ? 'ok' : 'bad'}`}>
              {d.correct ? '✓' : '✗'} Твой ответ: {d.given || '—'}{!d.correct && ` → правильный: ${d.correctAnswer}`}
            </div>
          ))}
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setStep('list')}>К списку тестов</button>
        </>
      )}
    </div>
  );
}
