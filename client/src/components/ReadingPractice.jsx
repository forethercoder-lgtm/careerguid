import React, { useState, useEffect } from 'react';
import { apiReadingTests, apiReadingTest, apiReadingSubmit } from '../api';
import './ReadingPractice.css';

export default function ReadingPractice({ token, onCancel }) {
  const [step, setStep] = useState('list'); // list | passage | result
  const [tests, setTests] = useState(null);
  const [test, setTest] = useState(null);
  const [passageIndex, setPassageIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiReadingTests(token).then(setTests).catch(() => setError('Не удалось загрузить тесты')).finally(() => setLoading(false));
  }, [token]);

  async function pickTest(t) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiReadingTest(token, t.id);
      setTest(data);
      setPassageIndex(0);
      setAnswers({});
      setStep('passage');
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
      const data = await apiReadingSubmit(token, test.id, Object.entries(answers).map(([itemId, value]) => ({ itemId, value })));
      setResult(data);
      setStep('result');
    } catch (e) {
      setError(e.message);
    }
    setSubmitting(false);
  }

  return (
    <div className="reading-page">
      <div className="reading-header">
        <h2>📖 Reading практика</h2>
        <button className="btn btn-ghost" onClick={() => (step === 'list' ? onCancel() : setStep('list'))}>← Назад</button>
      </div>

      {step === 'list' && (
        <>
          <p className="reading-hint">5 полных тестов Academic Reading — реальные тексты, 3 текста и ~40 вопросов на тест, с автопроверкой.</p>
          {loading && <div className="reading-loading">Загружаю...</div>}
          {error && <p className="reading-error">{error}</p>}
          {(tests || []).map(t => (
            <div key={t.id} className="reading-card" onClick={() => pickTest(t)}>
              <div className="reading-card-title">{t.title}</div>
              <div className="reading-card-meta">Band ~{t.band} · {t.passageCount} текста · {t.itemCount} вопросов</div>
            </div>
          ))}
        </>
      )}

      {step === 'passage' && test && (
        loading ? <div className="reading-loading">Загружаю...</div> : (
          <>
            <div className="reading-step-label">Текст {passageIndex + 1} / {test.passages.length}</div>
            <div className="reading-progress-track"><div className="reading-progress-fill" style={{ width: `${((passageIndex + 1) / test.passages.length) * 100}%` }} /></div>

            <h3 className="reading-passage-title">{test.passages[passageIndex].title}</h3>
            <div className="reading-passage-box">
              {test.passages[passageIndex].content.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
            </div>

            {test.passages[passageIndex].groups.map((g, gi) => (
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

            {passageIndex < test.passages.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setPassageIndex(i => i + 1)}>Следующий текст →</button>
            ) : (
              <button className="btn btn-primary" onClick={submit} disabled={submitting}>{submitting ? 'Проверяю...' : 'Завершить и проверить →'}</button>
            )}
          </>
        )
      )}

      {step === 'result' && result && (
        <>
          <div className="reading-score">✅ {result.correct} / {result.total} правильных</div>
          <p className="reading-hint">Это не официальный балл IELTS — просто проверка понимания. Ниже разбор по каждому вопросу.</p>
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
