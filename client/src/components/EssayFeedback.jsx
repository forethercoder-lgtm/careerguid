import React, { useState, useRef } from 'react';
import { apiEssayFeedback, apiExtractText } from '../api';
import './EssayFeedback.css';

export default function EssayFeedback({ token, onCancel }) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const data = await apiExtractText(token, file);
      setText(data.text || '');
    } catch (e) {
      alert('Не удалось прочитать файл: ' + e.message);
    }
    setUploading(false);
  }

  async function getFeedback() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await apiEssayFeedback(token, text);
      setResult(data);
    } catch (e) {
      setResult({ error: e.message });
    }
    setLoading(false);
  }

  return (
    <div className="essay-page">
      <div className="essay-header">
        <h2>✍️ Проверка эссе</h2>
        <button className="btn btn-ghost" onClick={onCancel}>← Назад к плану</button>
      </div>
      <p className="essay-hint">Вставь текст эссе или мотивационного письма, или загрузи файл — ИИ даст структурированный фидбек.</p>

      <textarea
        className="essay-textarea"
        rows={10}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Вставь текст эссе сюда..."
      />

      <div className="essay-actions">
        <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Читаю файл...' : '📄 Загрузить файл'}
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} onChange={handleFileChange} />
        <button className="btn btn-primary" onClick={getFeedback} disabled={loading || !text.trim()}>
          {loading ? 'Анализирую...' : 'Получить фидбек →'}
        </button>
      </div>

      {result && (
        <div className="essay-result">
          {result.error && <div className="plan-local-error">⚠️ {result.error}</div>}
          {!result.error && (
            <>
              {result.score && <div className="essay-score">Оценка: {result.score}</div>}
              {result.summary && <p className="essay-summary">{result.summary}</p>}
              {result.strengths?.length > 0 && (
                <div className="essay-section">
                  <h4>✅ Сильные стороны</h4>
                  <ul>{result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
              {result.improvements?.length > 0 && (
                <div className="essay-section">
                  <h4>💡 Что улучшить</h4>
                  <ul>{result.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
