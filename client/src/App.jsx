import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { ensureBackendSession } from './serverAuth';
import AuthScreen from './components/AuthScreen';
import WelcomeScreen from './components/WelcomeScreen';
import PreferencesSetup from './components/PreferencesSetup';
import PlanBuilder from './components/PlanBuilder';
import TaskManager from './components/TaskManager';
import AIAssistant from './components/AIAssistant';
import './App.css';

const NAV = [
  { id: 'plan', icon: '📋', label: 'План' },
  { id: 'tasks', icon: '✅', label: 'Задачи' },
];

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState(null);
  const [userPrefs, setUserPrefs] = useState(null);
  const [token, setToken] = useState('');
  const [tasks, setTasks] = useState([]);
  const [streak, setStreak] = useState(0);
  const [notif, setNotif] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) enterApp(fbUser);
        else setScreen('welcome');
      }, (err) => {
        console.error('Auth error:', err);
        setScreen('welcome');
      });
    } catch (e) {
      console.error('Firebase init error:', e);
      setScreen('welcome');
    }
    return unsub;
  }, []);

  function loadTasks(uid) {
    try { const s = localStorage.getItem(`tasks_${uid}`); return s ? JSON.parse(s) : []; }
    catch { return []; }
  }

  function loadStreak(uid) {
    try {
      const s = localStorage.getItem(`streak_${uid}`);
      const data = s ? JSON.parse(s) : { count: 0, lastDate: '' };
      const today = new Date().toISOString().split('T')[0];
      if (data.lastDate !== today) {
        const yd = new Date(); yd.setDate(yd.getDate() - 1);
        const yds = yd.toISOString().split('T')[0];
        const newCount = data.lastDate === yds ? data.count + 1 : 1;
        localStorage.setItem(`streak_${uid}`, JSON.stringify({ count: newCount, lastDate: today }));
        setStreak(newCount);
        if ([3, 7, 14, 30].includes(newCount)) showNotif(`🔥 ${newCount}-дневный стрик! Так держать!`);
      } else {
        setStreak(data.count);
      }
    } catch { setStreak(0); }
  }

  function showNotif(msg) {
    setNotif(msg);
    setTimeout(() => setNotif(null), 4000);
  }

  async function enterApp(fbUser) {
    setUser(fbUser);
    const prefs = JSON.parse(localStorage.getItem(`prefs_${fbUser.uid}`) || 'null');
    setUserPrefs(prefs);
    setTasks(loadTasks(fbUser.uid));
    loadStreak(fbUser.uid);

    try {
      const { token: t } = await ensureBackendSession(fbUser);
      setToken(t);
    } catch (e) {
      console.error('Backend session error:', e);
      showNotif('⚠️ Не удалось подключиться к серверу ИИ — попробуй обновить страницу');
    }

    setScreen(prefs ? 'plan' : 'preferences');
  }

  useEffect(() => {
    if (user?.uid) localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(tasks));
  }, [tasks, user?.uid]);

  async function installApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); showNotif('✅ Приложение установлено!'); }
  }

  function handleLogout() {
    signOut(auth);
    setUser(null); setUserPrefs(null); setToken(''); setTasks([]);
    setScreen('welcome');
  }

  const isApp = !['loading', 'welcome', 'auth', 'preferences'].includes(screen);

  if (screen === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loading-logo">🎓</div>
        <div className="loading-text">КарьерГид</div>
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      {notif && <div className="notif-toast">{notif}</div>}

      {isApp && (
        <header className="app-header">
          <div className="header-logo" onClick={() => setScreen('plan')} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">🎓</span>
            <span className="logo-text">КарьерГид</span>
          </div>
          {streak > 0 && <div className="header-streak">🔥 {streak}</div>}
          <nav className="header-nav">
            {NAV.map(n => (
              <button key={n.id} className={`hnav-btn ${screen === n.id ? 'active' : ''}`} onClick={() => setScreen(n.id)}>
                <span className="hnav-icon">{n.icon}</span>
                <span className="hnav-label">{n.label}</span>
              </button>
            ))}
          </nav>
          {installPrompt && (
            <button className="install-btn" onClick={installApp}>📲 Установить</button>
          )}
          {user && (
            <div className="header-user">
              <img src={user.photoURL || ''} className="user-photo" onError={e => e.target.style.display='none'} />
              <span className="user-name">{user.displayName || user.email}</span>
              <button className="logout-btn" onClick={handleLogout} title="Выйти">⎋</button>
            </div>
          )}
        </header>
      )}

      <main className="app-main">
        {screen === 'welcome' && <WelcomeScreen onStart={() => setScreen('auth')} />}
        {screen === 'auth' && <AuthScreen onAuth={enterApp} />}
        {screen === 'preferences' && (
          <PreferencesSetup user={user} onDone={(prefs) => {
            localStorage.setItem(`prefs_${user.uid}`, JSON.stringify(prefs));
            setUserPrefs(prefs);
            setScreen('plan');
          }} />
        )}
        {screen === 'plan' && (
          <PlanBuilder token={token} userEmail={user?.uid} prefs={userPrefs} tasks={tasks} setTasks={setTasks} showNotif={showNotif} />
        )}
        {screen === 'tasks' && (
          <TaskManager userEmail={user?.uid} tasks={tasks} setTasks={setTasks} />
        )}
      </main>

      {isApp && (
        <nav className="bottom-nav">
          {NAV.map(n => (
            <button key={n.id} className={`bnav-btn ${screen === n.id ? 'active' : ''}`} onClick={() => setScreen(n.id)}>
              <span className="bnav-icon">{n.icon}</span>
              <span className="bnav-label">{n.label}</span>
            </button>
          ))}
        </nav>
      )}

      {isApp && token && <AIAssistant token={token} />}
    </div>
  );
}
