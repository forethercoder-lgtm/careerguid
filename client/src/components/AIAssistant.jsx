import React, { useState, useRef, useEffect } from 'react';
import { apiAssistant } from '../api';
import './AIAssistant.css';

const QUICK = [
  'Какие документы нужны для поступления?',
  'Как получить студенческую визу?',
  'Какой балл IELTS нужен?',
  'Где найти стипендии?',
  'Как написать мотивационное письмо?',
];

export default function AIAssistant({ token }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, loading]);
  useEffect(() => { if (open) setUnread(0); }, [open]);

  async function send(text) {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    const history = [...msgs, { role: 'user', content: q }];
    setMsgs(history);
    setLoading(true);
    try {
      const data = await apiAssistant(token, history.map(m => ({ role: m.role, content: m.content })));
      const reply = { role: 'assistant', content: data.message || 'Ошибка' };
      setMsgs(h => [...h, reply]);
      if (!open) setUnread(n => n + 1);
    } catch {
      setMsgs(h => [...h, { role: 'assistant', content: '⚠️ Ошибка подключения к серверу' }]);
    }
    setLoading(false);
  }

  return (
    <>
      <button className={`ai-fab ${open ? 'active' : ''}`} onClick={() => setOpen(o => !o)} title="ИИ-ассистент">
        {open ? '✕' : '🤖'}
        {unread > 0 && !open && <span className="ai-badge">{unread}</span>}
      </button>

      <div className={`ai-panel ${open ? 'open' : ''}`}>
        <div className="ai-panel-header">
          <div className="ai-panel-title">
            <div className="ai-avatar">🤖</div>
            <div>
              <div className="ai-name">ИИ-ассистент</div>
              <div className="ai-status"><span className="status-dot" />спрашивай всё!</div>
            </div>
          </div>
          <button className="ai-close" onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className="ai-messages">
          {msgs.length === 0 && (
            <div className="ai-welcome">
              <div className="ai-welcome-icon">🎓</div>
              <p>Привет! Я помогу ответить на любые вопросы о поступлении за рубеж.</p>
              <div className="quick-questions">
                {QUICK.map((q, i) => (
                  <button key={i} className="quick-btn" onClick={() => send(q)}>{q}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={`ai-msg ${m.role}`}>
              {m.role === 'assistant' && <div className="msg-avatar">🤖</div>}
              <div className="msg-bubble">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="ai-msg assistant">
              <div className="msg-avatar">🤖</div>
              <div className="msg-bubble typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="ai-input-area">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Задай вопрос..."
            disabled={loading}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading} className="ai-send">↑</button>
        </div>
      </div>

      {open && <div className="ai-overlay" onClick={() => setOpen(false)} />}
    </>
  );
}
