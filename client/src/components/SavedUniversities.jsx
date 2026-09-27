import React, { useState, useEffect } from 'react';
import { getSavedUniversities, updateNote, removeSaved } from '../savedUniversities';
import './SavedUniversities.css';

export default function SavedUniversities({ userEmail }) {
  const [list, setList] = useState([]);

  useEffect(() => { setList(getSavedUniversities(userEmail)); }, [userEmail]);

  function onNoteChange(id, text) {
    setList(l => l.map(u => (u.id === id ? { ...u, notes: text } : u)));
  }

  function onNoteBlur(id, text) {
    updateNote(userEmail, id, text);
  }

  function onRemove(id) {
    setList(removeSaved(userEmail, id));
  }

  if (list.length === 0) return null;

  return (
    <div className="saved-unis-section">
      <h3>🏫 Мои университеты</h3>
      <div className="saved-unis-grid">
        {list.map(u => (
          <div key={u.id} className="saved-uni-card">
            <div className="saved-uni-top">
              <div>
                <div className="saved-uni-title">{u.name}</div>
                <div className="saved-uni-desc">{u.city ? `${u.city}, ` : ''}{u.country}</div>
              </div>
              <button className="saved-uni-del" onClick={() => onRemove(u.id)}>✕</button>
            </div>
            {u.ranking && <div className="saved-uni-meta">{u.ranking}</div>}
            {u.tuition && <div className="saved-uni-meta">💰 {u.tuition}</div>}
            {u.whyFit && <div className="saved-uni-why">{u.whyFit}</div>}
            <textarea
              className="saved-uni-note"
              value={u.notes}
              onChange={e => onNoteChange(u.id, e.target.value)}
              onBlur={e => onNoteBlur(u.id, e.target.value)}
              placeholder="Своя заметка про этот вуз..."
            />
          </div>
        ))}
      </div>
    </div>
  );
}
