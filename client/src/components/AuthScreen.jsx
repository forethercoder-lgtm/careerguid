import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE } from '../api';
import { GOOGLE_CLIENT_ID } from '../googleAuthConfig';
import './AuthScreen.css';

export default function AuthScreen({ onAuth }) {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  const handleGoogleResponse = useCallback(async (response) => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Не удалось войти через Google'); setLoading(false); return; }
      onAuth({ token: data.token, user: data.user });
    } catch {
      setError('Сервер недоступен. Проверь подключение.');
      setLoading(false);
    }
  }, [onAuth]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse });
      window.google.accounts.id.renderButton(googleBtnRef.current, { theme: 'outline', size: 'large', width: 360, text: 'continue_with' });
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, [handleGoogleResponse]);

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

        {GOOGLE_CLIENT_ID && (
          <>
            <div className="auth-divider"><span>или</span></div>
            <div ref={googleBtnRef} className="google-btn-container" />
          </>
        )}

        <div className="auth-security">🔒 Пароль хранится в зашифрованном виде</div>
      </div>
    </div>
  );
}
