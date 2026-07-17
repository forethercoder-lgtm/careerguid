import React, { useState, useEffect } from 'react';
import './TaskManager.css';

const CATS = ['📚 Учёба', '📝 Документы', '🗣 Языки', '💰 Финансы', '🏫 Университеты', '✍️ Эссе', '🔖 Другое'];

function getToday() { return new Date().toISOString().split('T')[0]; }
function getWeekEnd() {
  const d = new Date();
  d.setDate(d.getDate() + (7 - d.getDay()));
  return d.toISOString().split('T')[0];
}

export default function TaskManager({ userEmail, tasks, setTasks }) {
  const [tab, setTab] = useState('today');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', cat: CATS[0], due: getToday(), type: 'daily', note: '' });
  const [streak, setStreak] = useState(() => {
    const s = localStorage.getItem(`streak_${userEmail}`);
    return s ? JSON.parse(s) : { count: 0, lastDate: '' };
  });
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    const today = getToday();
    if (streak.lastDate !== today) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yd = yesterday.toISOString().split('T')[0];
      const newStreak = { count: streak.lastDate === yd ? streak.count + 1 : 1, lastDate: today };
      setStreak(newStreak);
      localStorage.setItem(`streak_${userEmail}`, JSON.stringify(newStreak));
    }
  }, []);

  function addTask() {
    if (!form.title.trim()) return;
    const task = { id: Date.now(), ...form, origin: 'ai-daily', done: false, createdAt: getToday() };
    setTasks(t => [task, ...t]);
    setForm({ title: '', cat: CATS[0], due: getToday(), type: 'daily', note: '' });
    setShowAdd(false);
  }

  function toggle(id) {
    setTasks(ts => ts.map(t => {
      if (t.id !== id) return t;
      const wasDone = t.done;
      if (!wasDone) { setCelebrate(true); setTimeout(() => setCelebrate(false), 2000); }
      return { ...t, done: !t.done };
    }));
  }

  function remove(id) { setTasks(ts => ts.filter(t => t.id !== id)); }

  const today = getToday();
  const weekEnd = getWeekEnd();
  const trackerTasks = tasks.filter(t => !t.origin || t.origin === 'ai-daily');
  const todayTasks = trackerTasks.filter(t => t.due === today);
  const weekTasks = trackerTasks.filter(t => t.due >= today && t.due <= weekEnd && t.due !== today);
  const overdueTasks = trackerTasks.filter(t => t.due < today && !t.done);
  const doneTodayCount = todayTasks.filter(t => t.done).length;

  const displayed = tab === 'today' ? todayTasks : tab === 'week' ? weekTasks : tab === 'overdue' ? overdueTasks : trackerTasks;

  return (
    <div className="tasks-page">
      {celebrate && (
        <div className="celebrate-banner">
          🎉 Задача выполнена! Так держать! +1 к streak!
        </div>
      )}

      <div className="tasks-top">
        <div className="streak-card">
          <div className="streak-flame">🔥</div>
          <div>
            <div className="streak-count">{streak.count} дней</div>
            <div className="streak-label">текущий стрик</div>
          </div>
          {streak.count >= 7 && <div className="streak-badge">🏆 {streak.count >= 30 ? 'Легенда' : streak.count >= 14 ? 'Мастер' : 'Неделя'}</div>}
        </div>

        {todayTasks.length > 0 && (
          <div className="today-progress">
            <div className="tp-label">Сегодня: {doneTodayCount}/{todayTasks.length}</div>
            <div className="tp-bar">
              <div className="tp-fill" style={{ width: `${todayTasks.length ? (doneTodayCount / todayTasks.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="tasks-header">
        <h2>Мои задачи</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Добавить</button>
      </div>

      {showAdd && (
        <div className="add-task-form">
          <input
            className="task-input"
            placeholder="Название задачи..."
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            autoFocus
          />
          <div className="form-row">
            <select className="task-select" value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>
              {CATS.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="task-select" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="daily">📅 Ежедневная</option>
              <option value="weekly">📆 Еженедельная</option>
              <option value="once">☑️ Разовая</option>
            </select>
            <input type="date" className="task-date" value={form.due} onChange={e => setForm(f => ({ ...f, due: e.target.value }))} />
          </div>
          <div className="form-actions">
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Отмена</button>
            <button className="btn btn-primary" onClick={addTask} disabled={!form.title.trim()}>Сохранить</button>
          </div>
        </div>
      )}

      <div className="tasks-tabs">
        {[
          { id: 'today', label: '📅 Сегодня', count: todayTasks.length },
          { id: 'week', label: '📆 Эта неделя', count: weekTasks.length },
          { id: 'overdue', label: '⚠️ Просрочено', count: overdueTasks.length },
          { id: 'all', label: '📋 Все', count: trackerTasks.length },
        ].map(t => (
          <button key={t.id} className={`ttab ${tab === t.id ? 'active' : ''} ${t.id === 'overdue' && overdueTasks.length > 0 ? 'danger' : ''}`}
            onClick={() => setTab(t.id)}>
            {t.label} {t.count > 0 && <span className="ttab-n">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="tasks-list">
        {displayed.length === 0 && (
          <div className="tasks-empty">
            {tab === 'today' ? '🎉 На сегодня всё выполнено!' : '📭 Нет задач в этом разделе'}
            <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>
              + Добавить задачу
            </button>
          </div>
        )}
        {displayed.map(task => (
          <div key={task.id} className={`task-card ${task.done ? 'done' : ''}`}>
            <button className="task-toggle" onClick={() => toggle(task.id)}>
              {task.done ? '✅' : '⬜'}
            </button>
            <div className="task-body">
              <div className="task-title">{task.title}</div>
              <div className="task-meta">
                <span className="task-cat">{task.cat}</span>
                <span className={`task-due ${task.due < today && !task.done ? 'overdue' : ''}`}>
                  {task.due === today ? '📅 Сегодня' : task.due < today ? `⚠️ ${task.due}` : `📆 ${task.due}`}
                </span>
              </div>
            </div>
            <button className="task-del" onClick={() => remove(task.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
