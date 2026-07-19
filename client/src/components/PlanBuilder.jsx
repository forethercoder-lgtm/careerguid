import React, { useState } from 'react';
import { apiDailyTasks, apiSuggestLocal } from '../api';
import './PlanBuilder.css';

const CATS = ['📚 Учёба', '📝 Документы', '🗣 Языки', '💰 Финансы', '🏫 Университеты', '✍️ Эссе', '🔖 Другое'];

function getToday() { return new Date().toISOString().split('T')[0]; }

export default function PlanBuilder({ token, userEmail, prefs, tasks, setTasks, showNotif, onOrientation }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', cat: CATS[0], note: '' });
  const [breaking, setBreaking] = useState(false);
  const [localResults, setLocalResults] = useState(null); // { taskId, city, results } | { taskId, loading: true }

  const planItems = tasks.filter(t => t.origin === 'plan');

  function addItem() {
    if (!form.title.trim()) return;
    const item = { id: Date.now(), title: form.title.trim(), cat: form.cat, note: form.note, origin: 'plan', done: false, createdAt: getToday() };
    setTasks(t => [item, ...t]);
    setForm({ title: '', cat: CATS[0], note: '' });
    setShowAdd(false);
  }

  function toggle(id) {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function remove(id) {
    setTasks(ts => ts.filter(t => t.id !== id));
  }

  async function breakIntoDays() {
    if (planItems.length === 0) return;
    setBreaking(true);
    try {
      const data = await apiDailyTasks(token, planItems.map(t => ({ title: t.title, category: t.cat, note: t.note })), prefs?.goal || '');
      if (data.tasks?.length > 0) {
        const today = getToday();
        setTasks(existing => {
          const newTasks = data.tasks.map((t, i) => ({
            id: Date.now() + i, title: t.title, cat: t.category || 'other',
            due: today, type: 'daily', note: t.note || '', origin: 'ai-daily',
            done: false, createdAt: today,
          }));
          const merged = [...existing, ...newTasks.filter(nt => !existing.some(e => e.title === nt.title))];
          return merged;
        });
        showNotif?.(`✅ ${data.tasks.length} ежедневных задач добавлено! Смотри вкладку "Задачи"`);
      }
    } catch (e) {
      showNotif?.('⚠️ Не удалось разбить план: ' + e.message);
    }
    setBreaking(false);
  }

  async function findLocal(item) {
    setLocalResults({ taskId: item.id, loading: true });
    try {
      const loc = prefs?.location || {};
      const data = await apiSuggestLocal(token, loc, item.title);
      setLocalResults({ taskId: item.id, city: data.city, results: data.results || [] });
    } catch (e) {
      setLocalResults({ taskId: item.id, error: e.message });
    }
  }

  return (
    <div className="plan-page">
      <div className="plan-header">
        <h2>Мой план</h2>
        {prefs?.goal && <p className="plan-goal">🎯 {prefs.goal}</p>}
        <div className="plan-header-meta">
          {prefs?.educationLevel && <span className="plan-tag">{prefs.educationLevel}</span>}
          {prefs?.targetSchool && <span className="plan-tag">🏫 {prefs.targetSchool}</span>}
        </div>
      </div>

      <div className="plan-actions">
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Добавить задачу</button>
        <button className="btn btn-ghost" onClick={breakIntoDays} disabled={breaking || planItems.length === 0}>
          {breaking ? 'Разбиваю...' : '🤖 Разбить на дни'}
        </button>
        <button className="btn btn-ghost" onClick={onOrientation}>🎓 Помощь с выбором</button>
      </div>

      {showAdd && (
        <div className="add-task-form">
          <input
            className="task-input"
            placeholder="Например: Сдать IELTS до марта"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addItem()}
            autoFocus
          />
          <div className="form-row">
            <select className="task-select" value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <input
              className="task-input"
              placeholder="Заметка (необязательно)"
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Отмена</button>
            <button className="btn btn-primary" onClick={addItem} disabled={!form.title.trim()}>Сохранить</button>
          </div>
        </div>
      )}

      <div className="plan-list">
        {planItems.length === 0 && !showAdd && (
          <div className="tasks-empty">
            📭 Впиши свой план — добавь первую задачу
            <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>+ Добавить задачу</button>
          </div>
        )}
        {planItems.map(item => (
          <div key={item.id} className={`task-card ${item.done ? 'done' : ''}`}>
            <button className="task-toggle" onClick={() => toggle(item.id)}>{item.done ? '✅' : '⬜'}</button>
            <div className="task-body">
              <div className="task-title">{item.cat} {item.title}</div>
              {item.note && <div className="plan-item-note">{item.note}</div>}
              <button className="plan-local-btn" onClick={() => findLocal(item)}>📍 Найти варианты</button>
              {localResults?.taskId === item.id && (
                <div className="plan-local-panel">
                  {localResults.loading && <div className="prefs-hint">Ищу...</div>}
                  {localResults.error && <div className="plan-local-error">⚠️ {localResults.error}</div>}
                  {localResults.results && (
                    <>
                      {localResults.city && <div className="prefs-hint">По запросу для города: {localResults.city}</div>}
                      {localResults.results.length === 0 && <div className="prefs-hint">Ничего не найдено</div>}
                      {localResults.results.map((r, i) => (
                        <a key={i} className="plan-local-result" href={r.url} target="_blank" rel="noopener noreferrer">
                          <div className="plan-local-result-title">{r.title}</div>
                          <div className="plan-local-result-content">{r.content}</div>
                        </a>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
            <button className="task-del" onClick={() => remove(item.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
