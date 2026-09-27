import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import WelcomeScreen from './components/WelcomeScreen';
import PreferencesSetup from './components/PreferencesSetup';
import Home from './components/Home';
import Orientation from './components/Orientation';
import EssayFeedback from './components/EssayFeedback';
import Ielts from './components/Ielts';
import Learn from './components/Learn';
import ReadingPractice from './components/ReadingPractice';
import ListeningPractice from './components/ListeningPractice';
import AIAssistant from './components/AIAssistant';
import './App.css';

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
    const savedToken = localStorage.getItem('token');
    const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (savedToken && savedUser) enterApp({ token: savedToken, user: savedUser });
    else setScreen('welcome');
  }, []);

  function loadTasks(uid) {
    try { const s = localStorage.getItem(`tasks_${uid}`); return s ? JSON.parse(s) : []; }
    catch { return []; }
  }

  function hasPlanItems(uid) {
    return loadTasks(uid).some(t => t.origin === 'plan');
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

  function enterApp({ token: t, user: u }) {
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    setToken(t);
    setUser(u);
    const prefs = JSON.parse(localStorage.getItem(`prefs_${u.id}`) || 'null');
    setUserPrefs(prefs);
    setTasks(loadTasks(u.id));
    loadStreak(u.id);
    if (!prefs) setScreen('preferences');
    else setScreen(hasPlanItems(u.id) ? 'home' : 'orientation');
  }

  useEffect(() => {
    if (user?.id) localStorage.setItem(`tasks_${user.id}`, JSON.stringify(tasks));
  }, [tasks, user?.id]);

  async function installApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') { setInstallPrompt(null); showNotif('✅ Приложение установлено!'); }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
          <div className="header-logo" onClick={() => setScreen('home')} style={{ cursor: 'pointer' }}>
            <span className="logo-icon">🎓</span>
            <span className="logo-text">КарьерГид</span>
          </div>
          {streak > 0 && <div className="header-streak">🔥 {streak}</div>}
          {installPrompt && (
            <button className="install-btn" onClick={installApp}>📲 Установить</button>
          )}
          {user && (
            <div className="header-user">
              <span className="user-name">{user.name || user.email}</span>
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
            localStorage.setItem(`prefs_${user.id}`, JSON.stringify(prefs));
            setUserPrefs(prefs);
            setScreen(hasPlanItems(user.id) ? 'home' : 'orientation');
          }} />
        )}
        {screen === 'home' && (
          <Home token={token} userEmail={user?.id} prefs={userPrefs} tasks={tasks} setTasks={setTasks} showNotif={showNotif}
            onOrientation={() => setScreen('orientation')} onEssayFeedback={() => setScreen('essay')} onIelts={() => setScreen('ielts')} streak={streak} />
        )}
        {screen === 'orientation' && (
          <Orientation token={token} userEmail={user?.id} prefs={userPrefs} tasks={tasks} setTasks={setTasks} showNotif={showNotif}
            onDone={() => setScreen('home')} onCancel={() => setScreen('home')} />
        )}
        {screen === 'essay' && (
          <EssayFeedback token={token} onCancel={() => setScreen('home')} />
        )}
        {screen === 'ielts' && (
          <Ielts token={token} userEmail={user?.id} tasks={tasks} setTasks={setTasks} showNotif={showNotif} onCancel={() => setScreen('home')} onLearn={() => setScreen('learn')} onReading={() => setScreen('reading')} onListening={() => setScreen('listening')} />
        )}
        {screen === 'learn' && (
          <Learn token={token} onCancel={() => setScreen('ielts')} />
        )}
        {screen === 'reading' && (
          <ReadingPractice token={token} onCancel={() => setScreen('ielts')} />
        )}
        {screen === 'listening' && (
          <ListeningPractice token={token} onCancel={() => setScreen('ielts')} />
        )}
      </main>

      {isApp && token && <AIAssistant token={token} />}
    </div>
  );
}
