import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { crashed: false, error: '' }; }
  static getDerivedStateFromError(e) { return { crashed: true, error: e?.message || 'Ошибка' }; }
  render() {
    if (this.state.crashed) return (
      <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'#0a0a1a', color:'#fff', padding:'24px', textAlign:'center' }}>
        <div style={{ fontSize:'48px' }}>🎓</div>
        <h2 style={{ margin:'16px 0 8px' }}>КарьерГид</h2>
        <p style={{ color:'#aaa', marginBottom:'24px' }}>Что-то пошло не так. Перезагрузи страницу.</p>
        <button onClick={() => window.location.reload()} style={{ background:'#6366f1', color:'#fff', border:'none', borderRadius:'12px', padding:'12px 28px', fontSize:'16px', cursor:'pointer' }}>
          Перезагрузить
        </button>
        <p style={{ color:'#555', fontSize:'12px', marginTop:'16px' }}>{this.state.error}</p>
      </div>
    );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
