import React, { useState, useEffect } from 'react';
import { apiIeltsLearn } from '../api';
import './Learn.css';

const SKILL_LABELS = {
  listening: '🎧 Listening',
  reading: '📖 Reading',
  writingTask1: '✍️ Writing Task 1',
  writingTask2: '✍️ Writing Task 2 и прогресс по band',
  speaking: '🗣 Speaking',
  vocabulary: '📚 Лексика по темам',
  grammar: '🔤 Грамматика',
};
const SKILL_ORDER = ['listening', 'reading', 'writingTask1', 'writingTask2', 'speaking', 'vocabulary', 'grammar'];
const GUIDE_TYPE_LABELS = { general: 'Общие гайды', topic: 'По процессу поступления', country: 'По странам' };
const GUIDE_TYPE_ORDER = ['general', 'topic', 'country'];
const TABS = [
  { id: 'lessons', label: 'Уроки' },
  { id: 'practice', label: 'Практика' },
  { id: 'guides', label: 'Гайды' },
];

export default function Learn({ token, onCancel }) {
  const [tab, setTab] = useState('lessons');
  const [practiceSub, setPracticeSub] = useState('essays');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    apiIeltsLearn(token).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [token]);

  function toggle(id) {
    setExpanded(e => ({ ...e, [id]: !e[id] }));
  }

  return (
    <div className="learn-page">
      <div className="learn-header">
        <h2>📚 Уроки и материалы</h2>
        <button className="btn btn-ghost" onClick={onCancel}>← Назад к плану</button>
      </div>

      <div className="learn-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`learn-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {loading && <div className="learn-loading">Загружаю материалы...</div>}
      {error && <div className="plan-local-error">⚠️ {error}</div>}

      {data && !loading && (
        <div className="learn-body">
          {tab === 'lessons' && SKILL_ORDER.map(skill => (
            <div key={skill} className="learn-group">
              <h3 className="learn-group-title">{SKILL_LABELS[skill]}</h3>
              {data.lessons.filter(l => l.skill === skill).map(l => (
                <div key={l.id} className="learn-card" onClick={() => toggle(l.id)}>
                  <div className="learn-card-title">{expanded[l.id] ? '▾' : '▸'} {l.title}</div>
                  {expanded[l.id] && (
                    <div className="learn-card-body">
                      <ul>{l.points.map((p, i) => <li key={i}>{p}</li>)}</ul>
                      {l.tip && <div className="learn-tip">💡 {l.tip}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {tab === 'practice' && (
            <>
              <div className="learn-subtabs">
                <button className={`learn-subtab ${practiceSub === 'essays' ? 'active' : ''}`} onClick={() => setPracticeSub('essays')}>
                  Эссе ({Object.values(data.practiceBank).flat().length})
                </button>
                <button className={`learn-subtab ${practiceSub === 'speaking' ? 'active' : ''}`} onClick={() => setPracticeSub('speaking')}>
                  Speaking ({Object.values(data.part2Categories).flat().length})
                </button>
              </div>

              {practiceSub === 'essays' && Object.entries(data.practiceBank).map(([cat, prompts]) => (
                <div key={cat} className="learn-group">
                  <h3 className="learn-group-title">{cat}</h3>
                  {prompts.map((p, i) => <div key={i} className="learn-card learn-card-static">{p}</div>)}
                </div>
              ))}

              {practiceSub === 'speaking' && Object.entries(data.part2Categories).map(([cat, topics]) => (
                <div key={cat} className="learn-group">
                  <h3 className="learn-group-title">{cat}</h3>
                  {topics.map((t, i) => {
                    const set = data.part3Sets.find(ps => ps.part2Topic === t);
                    const id = 'p2-' + cat + i;
                    return (
                      <div key={id} className="learn-card" onClick={() => set && toggle(id)} style={{ cursor: set ? 'pointer' : 'default' }}>
                        <div className="learn-card-title">{set ? (expanded[id] ? '▾ ' : '▸ ') : ''}{t}</div>
                        {set && expanded[id] && (
                          <div className="learn-card-body">
                            <div className="learn-tip">Вопросы Part 3 по теме:</div>
                            <ul>{set.questions.map((q, qi) => <li key={qi}>{q}</li>)}</ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}

          {tab === 'guides' && GUIDE_TYPE_ORDER.map(type => (
            <div key={type} className="learn-group">
              <h3 className="learn-group-title">{GUIDE_TYPE_LABELS[type]} ({data.guides.filter(g => g.type === type).length})</h3>
              {data.guides.filter(g => g.type === type).map(g => (
                <div key={g.id} className="learn-card" onClick={() => toggle(g.id)}>
                  <div className="learn-card-title">{expanded[g.id] ? '▾' : '▸'} {g.title}</div>
                  {expanded[g.id] && (
                    <div className="learn-card-body">
                      {g.sections.map((sec, i) => (
                        <div key={i} className="learn-guide-section">
                          <div className="learn-section-heading">{sec.heading}</div>
                          <div className="learn-section-body">{sec.body}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
