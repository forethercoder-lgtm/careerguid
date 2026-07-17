import React, { useEffect, useState } from 'react';
import './WelcomeScreen.css';

const features = [
  { icon: '✍️', title: 'Твой собственный план', desc: 'Впиши свою цель и задачи — никаких навязанных сценариев' },
  { icon: '🤖', title: 'ИИ-помощник', desc: 'Помогает по запросу и ищет актуальную информацию в интернете' },
  { icon: '📍', title: 'Локальные варианты', desc: 'Подсказывает курсы и места рядом с тобой по геолокации' },
  { icon: '✅', title: 'Ежедневный трекер', desc: 'ИИ разбивает твой план на задачи по дням с чек-листом' },
];

const countries = ['🇩🇪 Германия', '🇨🇦 Канада', '🇳🇱 Нидерланды', '🇦🇺 Австралия', '🇺🇸 США', '🇬🇧 Великобритания', '🇸🇪 Швеция', '🇨🇿 Чехия'];

export default function WelcomeScreen({ onStart }) {
  const [visible, setVisible] = useState(false);
  const [tagIndex, setTagIndex] = useState(0);

  useEffect(() => {
    setVisible(true);
    const interval = setInterval(() => setTagIndex(i => (i + 1) % countries.length), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`welcome ${visible ? 'visible' : ''}`}>
      <div className="welcome-bg">
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />
        <div className="bg-orb bg-orb-3" />
      </div>

      <div className="welcome-content">
        <div className="welcome-badge">
          <span className="badge-dot" />
          Твой план поступления с ИИ-помощником
        </div>

        <h1 className="welcome-title">
          Найди свой путь в<br />
          <span className="gradient-text">мировые университеты</span>
        </h1>

        <p className="welcome-subtitle">
          Впиши свою цель и свой план — ИИ поможет разбить его на задачи по дням<br />
          и подскажет курсы и места рядом с тобой.
        </p>

        <div className="country-ticker">
          <span className="ticker-label">Популярные направления:</span>
          <span className="ticker-item">{countries[tagIndex]}</span>
        </div>

        <div className="welcome-actions">
          <button className="btn btn-primary btn-lg start-btn" onClick={onStart}>
            <span>Начать</span>
            <span className="btn-arrow">→</span>
          </button>
          <p className="welcome-hint">Бесплатно · На русском языке</p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="feature-icon">{f.icon}</div>
              <div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="welcome-stats">
          <div className="stat"><span className="stat-num">50+</span><span className="stat-label">стран</span></div>
          <div className="stat-divider" />
          <div className="stat"><span className="stat-num">1000+</span><span className="stat-label">университетов</span></div>
          <div className="stat-divider" />
          <div className="stat"><span className="stat-num">∞</span><span className="stat-label">возможностей</span></div>
        </div>
      </div>
    </div>
  );
}
