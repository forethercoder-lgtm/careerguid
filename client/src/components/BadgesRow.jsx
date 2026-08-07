import React from 'react';
import './BadgesRow.css';

export default function BadgesRow({ streak = 0, doneCount = 0, planCount = 0 }) {
  const badges = [
    planCount > 0 && { icon: '📋', label: 'План готов' },
    streak >= 3 && { icon: '🔥', label: '3 дня подряд' },
    streak >= 7 && { icon: '🏅', label: 'Неделя' },
    streak >= 14 && { icon: '🥈', label: 'Мастер' },
    streak >= 30 && { icon: '🏆', label: 'Легенда' },
    doneCount >= 10 && { icon: '✅', label: 'Первые 10' },
    doneCount >= 50 && { icon: '💪', label: '50 задач' },
  ].filter(Boolean);

  if (badges.length === 0) return null;

  return (
    <div className="badges-row">
      {badges.map((b, i) => (
        <div key={i} className="badge-chip">
          <span className="badge-icon">{b.icon}</span>
          <span className="badge-label">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
