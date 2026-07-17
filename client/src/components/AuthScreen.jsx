import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import './AuthScreen.css';

export default function AuthScreen({ onAuth }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function signInWithGoogle() {
    setLoading(true);
    setError('');
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      onAuth(cred.user);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('');
      } else if (err.code === 'auth/popup-blocked') {
        setError('Браузер заблокировал всплывающее окно. Разреши попапы для этого сайта.');
      } else {
        setError(`Ошибка: ${err.code || err.message}`);
      }
    } finally {
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

        <h2 className="auth-title">Добро пожаловать!</h2>
        <p className="auth-subtitle">Войди через Google и начни путь к мечте</p>

        {error && <div className="auth-error">⚠️ {error}</div>}

        <button
          className="google-btn"
          onClick={signInWithGoogle}
          disabled={loading}
        >
          {loading ? (
            <><span className="spinner" /> Входим...</>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5l-6.2-5.2C29.5 35.6 26.9 36 24 36c-5.2 0-9.6-3-11.3-7.4l-6.5 5C9.4 39.4 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.2 5.2C40.8 35.5 44 30.2 44 24c0-1.3-.1-2.7-.4-4z"/>
              </svg>
              Войти через Google
            </>
          )}
        </button>

        <div className="auth-security">
          🔒 Безопасный вход через аккаунт Google
        </div>
      </div>
    </div>
  );
}
