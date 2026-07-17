import React, { useState, useEffect } from 'react';
import './PortfolioTab.css';

const STATUS_LABELS = {
  done: { label: 'Готово', color: '#10b981', emoji: '✅' },
  in_progress: { label: 'В процессе', color: '#f59e0b', emoji: '🔄' },
  not_started: { label: 'Не начато', color: '#475569', emoji: '⬜' },
  not_asked: { label: 'Не запросил', color: '#475569', emoji: '⬜' },
  pending: { label: 'Нужно', color: '#475569', emoji: '⬜' },
};

const NEXT_STATUS = {
  pending: 'in_progress',
  not_started: 'in_progress',
  not_asked: 'in_progress',
  in_progress: 'done',
  done: 'pending',
};

const DEFAULT_PORTFOLIO = {
  tests: [
    { id: 't1', name: 'IELTS', target: '6.5+', score: '', status: 'pending', note: '' },
    { id: 't2', name: 'TOEFL', target: '90+', score: '', status: 'pending', note: '' },
    { id: 't3', name: 'SAT / ACT', target: '1200+', score: '', status: 'pending', note: '' },
    { id: 't4', name: 'GRE / GMAT', target: '310+', score: '', status: 'pending', note: '' },
  ],
  essays: [
    { id: 'e1', name: 'Personal Statement', status: 'not_started', words: '', note: '' },
    { id: 'e2', name: 'Motivational Letter', status: 'not_started', words: '', note: '' },
    { id: 'e3', name: 'Why This University?', status: 'not_started', words: '', note: '' },
    { id: 'e4', name: 'Statement of Purpose', status: 'not_started', words: '', note: '' },
  ],
  recommendations: [
    { id: 'r1', name: 'Рекомендация #1', from: '', status: 'not_asked' },
    { id: 'r2', name: 'Рекомендация #2', from: '', status: 'not_asked' },
    { id: 'r3', name: 'Рекомендация #3', from: '', status: 'not_asked' },
  ],
  documents: [
    { id: 'd1', name: 'Аттестат / Диплом', status: 'pending' },
    { id: 'd2', name: 'Транскрипт оценок', status: 'pending' },
    { id: 'd3', name: 'Нотариальный перевод диплома', status: 'pending' },
    { id: 'd4', name: 'Паспорт (действующий)', status: 'pending' },
    { id: 'd5', name: 'Фото 3×4', status: 'pending' },
    { id: 'd6', name: 'Медицинская справка', status: 'pending' },
  ],
  achievements: [],
};

function calcProgress(portfolio) {
  const all = [...portfolio.tests, ...portfolio.essays, ...portfolio.recommendations, ...portfolio.documents, ...portfolio.achievements];
  const done = all.filter(i => i.status === 'done').length;
  return all.length === 0 ? 0 : Math.round((done / all.length) * 100);
}

export default function PortfolioTab({ userEmail }) {
  const KEY = `portfolio_${userEmail || 'default'}`;
  const [portfolio, setPortfolio] = useState(() => {
    try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : DEFAULT_PORTFOLIO; }
    catch { return DEFAULT_PORTFOLIO; }
  });
  const [tab, setTab] = useState('tests');
  const [newAchievement, setNewAchievement] = useState('');
  const [editing, setEditing] = useState({});

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(portfolio));
  }, [portfolio]);

  function updateItem(section, id, changes) {
    setPortfolio(p => ({ ...p, [section]: p[section].map(i => i.id === id ? { ...i, ...changes } : i) }));
  }

  function cycleStatus(section, id, current) {
    updateItem(section, id, { status: NEXT_STATUS[current] || 'pending' });
  }

  function addAchievement() {
    if (!newAchievement.trim()) return;
    const item = { id: `a${Date.now()}`, name: newAchievement.trim(), status: 'done' };
    setPortfolio(p => ({ ...p, achievements: [...p.achievements, item] }));
    setNewAchievement('');
  }

  function removeAchievement(id) {
    setPortfolio(p => ({ ...p, achievements: p.achievements.filter(a => a.id !== id) }));
  }

  const progress = calcProgress(portfolio);

  const tabs = [
    { id: 'tests', label: '📝 Экзамены', count: portfolio.tests.filter(t => t.status === 'done').length, total: portfolio.tests.length },
    { id: 'essays', label: '✍️ Эссе', count: portfolio.essays.filter(e => e.status === 'done').length, total: portfolio.essays.length },
    { id: 'recommendations', label: '📨 Рекомендации', count: portfolio.recommendations.filter(r => r.status === 'done').length, total: portfolio.recommendations.length },
    { id: 'documents', label: '📄 Документы', count: portfolio.documents.filter(d => d.status === 'done').length, total: portfolio.documents.length },
    { id: 'achievements', label: '🏆 Достижения', count: portfolio.achievements.length, total: null },
  ];

  return (
    <div className="portfolio">
      <div className="portfolio-overview">
        <div className="portfolio-progress-wrap">
          <div className="portfolio-progress-ring">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="url(#pg)" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 42 * progress / 100} ${2 * Math.PI * 42 * (1 - progress / 100)}`}
                strokeLinecap="round" transform="rotate(-90 50 50)" />
              <defs>
                <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
            </svg>
            <div className="progress-center">
              <span className="progress-num">{progress}%</span>
              <span className="progress-lbl">готово</span>
            </div>
          </div>
          <div className="portfolio-stats-grid">
            {tabs.filter(t => t.total !== null).map(t => (
              <div key={t.id} className="portfolio-stat">
                <span className="pstat-label">{t.label}</span>
                <span className="pstat-val">{t.count}/{t.total}</span>
                <div className="pstat-bar">
                  <div className="pstat-fill" style={{ width: `${t.total ? (t.count / t.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="portfolio-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`ptab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.total !== null
              ? <span className="ptab-count" style={{ background: t.count === t.total && t.total > 0 ? 'rgba(16,185,129,0.3)' : '' }}>{t.count}/{t.total}</span>
              : <span className="ptab-count">{t.count}</span>
            }
          </button>
        ))}
      </div>

      <div className="portfolio-body">
        {tab === 'tests' && (
          <div className="section-list">
            <div className="section-tip">💡 Нажми на статус чтобы изменить. Введи свой результат в поле «Балл».</div>
            {portfolio.tests.map(item => {
              const st = STATUS_LABELS[item.status];
              return (
                <div key={item.id} className="port-item">
                  <button className="status-btn" style={{ color: st.color, borderColor: `${st.color}40`, background: `${st.color}12` }}
                    onClick={() => cycleStatus('tests', item.id, item.status)}>
                    {st.emoji} {st.label}
                  </button>
                  <div className="port-item-body">
                    <div className="port-item-name">{item.name}</div>
                    <div className="port-item-target">Цель: {item.target}</div>
                  </div>
                  <input
                    className="score-input"
                    placeholder="Балл"
                    value={item.score}
                    onChange={e => updateItem('tests', item.id, { score: e.target.value })}
                  />
                </div>
              );
            })}
          </div>
        )}

        {tab === 'essays' && (
          <div className="section-list">
            <div className="section-tip">💡 Нажми на статус для обновления. Введи количество слов.</div>
            {portfolio.essays.map(item => {
              const st = STATUS_LABELS[item.status];
              return (
                <div key={item.id} className="port-item">
                  <button className="status-btn" style={{ color: st.color, borderColor: `${st.color}40`, background: `${st.color}12` }}
                    onClick={() => cycleStatus('essays', item.id, item.status)}>
                    {st.emoji} {st.label}
                  </button>
                  <div className="port-item-body">
                    <div className="port-item-name">{item.name}</div>
                  </div>
                  <input
                    className="score-input"
                    placeholder="Слов"
                    value={item.words}
                    onChange={e => updateItem('essays', item.id, { words: e.target.value })}
                  />
                </div>
              );
            })}
          </div>
        )}

        {tab === 'recommendations' && (
          <div className="section-list">
            <div className="section-tip">💡 Нажми статус. Введи имя человека который пишет рекомендацию.</div>
            {portfolio.recommendations.map(item => {
              const st = STATUS_LABELS[item.status];
              return (
                <div key={item.id} className="port-item">
                  <button className="status-btn" style={{ color: st.color, borderColor: `${st.color}40`, background: `${st.color}12` }}
                    onClick={() => cycleStatus('recommendations', item.id, item.status)}>
                    {st.emoji} {st.label}
                  </button>
                  <div className="port-item-body">
                    <div className="port-item-name">{item.name}</div>
                  </div>
                  <input
                    className="score-input"
                    style={{ minWidth: 140 }}
                    placeholder="Кто пишет?"
                    value={item.from}
                    onChange={e => updateItem('recommendations', item.id, { from: e.target.value })}
                  />
                </div>
              );
            })}
          </div>
        )}

        {tab === 'documents' && (
          <div className="section-list">
            <div className="section-tip">💡 Нажми на статус чтобы отметить документ готовым.</div>
            {portfolio.documents.map(item => {
              const st = STATUS_LABELS[item.status];
              return (
                <div key={item.id} className="port-item">
                  <button className="status-btn" style={{ color: st.color, borderColor: `${st.color}40`, background: `${st.color}12` }}
                    onClick={() => cycleStatus('documents', item.id, item.status)}>
                    {st.emoji} {st.label}
                  </button>
                  <div className="port-item-body">
                    <div className="port-item-name">{item.name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'achievements' && (
          <div className="section-list">
            <div className="section-tip">🏆 Добавь свои достижения: олимпиады, проекты, волонтёрство, работа...</div>
            <div className="achievement-add">
              <input
                className="achievement-input"
                placeholder="Например: Победитель олимпиады по математике 2025"
                value={newAchievement}
                onChange={e => setNewAchievement(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAchievement()}
              />
              <button className="btn btn-primary" onClick={addAchievement} disabled={!newAchievement.trim()}>
                Добавить
              </button>
            </div>
            {portfolio.achievements.length === 0 && (
              <div className="achievements-empty">Добавь свои достижения — они укрепят твою заявку!</div>
            )}
            {portfolio.achievements.map(item => (
              <div key={item.id} className="achievement-item">
                <span className="achievement-icon">🏆</span>
                <span className="achievement-name">{item.name}</span>
                <button className="remove-btn" onClick={() => removeAchievement(item.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
