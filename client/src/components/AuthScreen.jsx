import React, { useState } from 'react';
import { API_BASE } from '../api';
import './AuthScreen.css';

export default function AuthScreen({ onAuth }) {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Заполни все поля'); return; }
    if (tab === 'register' && !name.trim()) { setError('Введи своё имя'); return; }
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/${tab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Ошибка входа'); setLoading(false); return; }
      onAuth({ token: data.token, user: data.user });
    } catch {
      setError('Сервер недоступен. Проверь подключение.');
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🎓</span>
          <span className="auth-logo-text">КарьерГид</span>
        </div>

        <h2 className="auth-title">{tab === 'login' ? 'Добро пожаловать!' : 'Создай аккаунт'}</h2>
        <p className="auth-subtitle">{tab === 'login' ? 'Войди чтобы продолжить' : 'Зарегистрируйся бесплатно'}</p>

        <div className="auth-tabs">
          <button type="button" className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); }}>Войти</button>
          <button type="button" className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); }}>Регистрация</button>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>⚠️ {error}</div>}

        <form className="auth-form" onSubmit={submit}>
          {tab === 'register' && (
            <div className="field">
              <label>Твоё имя</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Как тебя зовут?" />
            </div>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@mail.com" autoCapitalize="none" />
          </div>
          <div className="field">
            <label>Пароль</label>
            <div className="pw-wrapper">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Минимум 6 символов" />
              <button type="button" className="pw-toggle" onClick={() => setShowPassword(s => !s)} tabIndex={-1}>{showPassword ? '🙈' : '👁'}</button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Загрузка...</> : (tab === 'login' ? 'Войти →' : 'Создать аккаунт →')}
          </button>
        </form>

        <div className="auth-security">🔒 Пароль хранится в зашифрованном виде</div>
      </div>
    </div>
  );
}
