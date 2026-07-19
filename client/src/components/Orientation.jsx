import React, { useState, useEffect, useRef } from 'react';
import { apiOrientationChat, apiSuggestSpecialties, apiSuggestUniversities, apiGenerateStarterPlan } from '../api';
import './Orientation.css';

export default function Orientation({ token, prefs, tasks, setTasks, showNotif, onDone, onCancel }) {
  const [step, setStep] = useState('chat'); // chat | specialties | universities
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [adding, setAdding] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { if (messages.length === 0) sendInitial(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  async function sendInitial() {
    setLoading(true);
    try {
      const data = await apiOrientationChat(token, [{ role: 'user', content: 'Начни беседу' }]);
      if (data.message) setMessages([{ role: 'assistant', content: data.message }]);
    } catch (e) {
      showNotif?.('⚠️ Не удалось начать беседу: ' + e.message);
    }
    setLoading(false);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const data = await apiOrientationChat(token, next.map(m => ({ role: m.role, content: m.content })));
      if (data.message) setMessages(m => [...m, { role: 'assistant', content: data.message }]);
      if (data.readyForResults) {
        setTimeout(() => loadSpecialties(data.message), 1200);
      }
    } catch (e) {
      showNotif?.('⚠️ Ошибка: ' + e.message);
    }
    setLoading(false);
  }

  async function loadSpecialties(lastMessage) {
    setLoading(true);
    try {
      const data = await apiSuggestSpecialties(token, lastMessage);
      setSpecialties(data.specialties || []);
      setStep('specialties');
    } catch (e) {
      showNotif?.('⚠️ Не удалось подобрать специальности: ' + e.message);
    }
    setLoading(false);
  }

  async function pickSpecialty(sp) {
    setSelectedSpecialty(sp);
    setLoading(true);
    try {
      const data = await apiSuggestUniversities(token, {
        specialty: sp.title,
        strategy: prefs?.strategy,
        countries: prefs?.countries,
        educationLevel: prefs?.educationLevel,
      });
      setUniversities(data.universities || []);
      setStep('universities');
    } catch (e) {
      showNotif?.('⚠️ Не удалось подобрать университеты: ' + e.message);
    }
    setLoading(false);
  }

  async function addToPlan() {
    const best = universities.find(u => u.isBestPick) || universities[0];
    setAdding(true);
    try {
      const data = await apiGenerateStarterPlan(token, {
        specialty: selectedSpecialty?.title,
        university: best ? `${best.name} (${best.country})` : '',
        goal: prefs?.goal,
      });
      const items = data.items || [];
      const today = new Date().toISOString().split('T')[0];
      const newItems = items.map((it, i) => ({
        id: Date.now() + i, title: it.title, cat: it.category || 'other',
        note: it.note || '', origin: 'plan', done: false, createdAt: today,
      }));
      setTasks(existing => [...existing, ...newItems.filter(nt => !existing.some(e => e.title === nt.title))]);
      showNotif?.(`✅ Добавлено ${items.length} задач в план по специальности «${selectedSpecialty?.title}»`);
      onDone();
    } catch (e) {
      showNotif?.('⚠️ Не удалось построить план: ' + e.message);
    }
    setAdding(false);
  }

  return (
    <div className="orient-page">
      <div className="orient-header">
        <h2>🎓 Помощь с выбором</h2>
        <button className="btn btn-ghost" onClick={onCancel}>← Назад к плану</button>
      </div>

      {step === 'chat' && (
        <div className="orient-chat">
          <div className="orient-messages">
            {messages.map((m, i) => (
              <div key={i} className={`orient-msg ${m.role}`}>{m.content}</div>
            ))}
            {loading && <div className="orient-msg assistant orient-typing">печатает…</div>}
            <div ref={endRef} />
          </div>
          <div className="orient-input-row">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Напиши свой ответ..."
              disabled={loading}
            />
            <button className="btn btn-primary" onClick={send} disabled={loading || !input.trim()}>→</button>
          </div>
        </div>
      )}

      {step === 'specialties' && (
        <div className="orient-grid">
          {loading && <div className="orient-loading">Подбираю специальности...</div>}
          {!loading && specialties.map(sp => (
            <div key={sp.id} className="orient-card" onClick={() => pickSpecialty(sp)}>
              <div className="orient-card-emoji">{sp.emoji}</div>
              <div className="orient-card-title">{sp.title}</div>
              <div className="orient-card-desc">{sp.description}</div>
              <div className="orient-card-why">{sp.why}</div>
              <div className="orient-card-meta">💰 {sp.salary} · 📈 {sp.demand}</div>
            </div>
          ))}
        </div>
      )}

      {step === 'universities' && (
        <div>
          {loading && <div className="orient-loading">Ищу университеты...</div>}
          {!loading && (
            <>
              <div className="orient-grid">
                {universities.map((u, i) => (
                  <div key={i} className={`orient-card ${u.isBestPick ? 'best' : ''}`}>
                    {u.isBestPick && <div className="orient-best-badge">🏆 Рекомендуем</div>}
                    <div className="orient-card-title">{u.name}</div>
                    <div className="orient-card-desc">{u.city ? `${u.city}, ` : ''}{u.country}</div>
                    {u.ranking && <div className="orient-card-meta">{u.ranking}</div>}
                    {u.tuition && <div className="orient-card-meta">💰 {u.tuition}</div>}
                    <div className="orient-card-why">{u.whyFit}</div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={addToPlan} disabled={adding}>
                {adding ? 'Строю план...' : `Добавить план для «${selectedSpecialty?.title}» →`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
