import React, { useState, useEffect } from 'react';
import PlanBuilder from './PlanBuilder';
import TaskManager from './TaskManager';
import { getDocuments, deleteDocument } from '../docStorage';
import './Home.css';

export default function Home({ token, userEmail, prefs, tasks, setTasks, showNotif, onOrientation, onEssayFeedback, streak }) {
  const [documents, setDocuments] = useState([]);

  useEffect(() => { setDocuments(getDocuments(userEmail)); }, [userEmail]);

  function handleDelete(id) {
    setDocuments(deleteDocument(userEmail, id));
  }

  return (
    <div className="home-page">
      <PlanBuilder token={token} userEmail={userEmail} prefs={prefs} tasks={tasks} setTasks={setTasks}
        showNotif={showNotif} onOrientation={onOrientation} onEssayFeedback={onEssayFeedback}
        streak={streak} setDocuments={setDocuments} />

      {documents.length > 0 && (
        <div className="vault-section">
          <h3>📁 Документы</h3>
          <div className="vault-list">
            {documents.map(doc => (
              <div key={doc.id} className="vault-item">
                <a href={doc.dataUrl} download={doc.name} className="vault-item-link">
                  <span className="vault-item-icon">📄</span>
                  <div className="vault-item-info">
                    <div className="vault-item-name">{doc.name}</div>
                    <div className="vault-item-meta">{(doc.size / 1024).toFixed(0)} КБ</div>
                  </div>
                </a>
                <button className="vault-item-del" onClick={() => handleDelete(doc.id)}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="home-divider" />
      <TaskManager userEmail={userEmail} tasks={tasks} setTasks={setTasks} />
    </div>
  );
}
