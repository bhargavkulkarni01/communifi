import {useEffect, useRef, useState} from 'react';
import {HashRouter, Routes, Route, NavLink, Link, Navigate} from 'react-router-dom';
import {api, setToken, getSaved, loadScript} from './api';
import {Ctx, Icon, NATIVE} from './ui';
import Home from './pages/Home';
import Report from './pages/Report';
import Reports from './pages/Reports';
import Detail from './pages/Detail';
import Notifications from './pages/Notifications';
import MapPage from './pages/MapPage';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import './styles.css';
import logo from './assets/logo.png';

const NAV = [['/', 'Home', 'home'], ['/report', 'Report Issue', 'plus'], ['/reports', 'My Reports', 'list'], ['/map', 'Map', 'map'], ['/notifications', 'Notifications', 'bell'], ['/settings', 'Settings', 'gear']];
const SHORT = {'/': 'Home', '/report': 'Report', '/reports': 'Mine', '/map': 'Map', '/notifications': 'Updates', '/settings': 'Settings', '/admin': 'Admin'};

export default function App() {
  const [me, setMe] = useState(), [q, setQ] = useState(''), [err, setErr] = useState(''), btn = useRef();
  const login = async idt => { setToken((await api('/auth/google', {method: 'POST', body: {id_token: idt}})).token); setMe(await api('/me')); };
  useEffect(() => {
    (async () => {
      if (window.NATIVE_ID_TOKEN) return login(window.NATIVE_ID_TOKEN);
      const saved = getSaved();
      if (saved) { try { setToken(saved); setMe(await api('/me')); return; } catch { setToken(null); } }
      const {google_client_id} = await api('/config');
      await loadScript('https://accounts.google.com/gsi/client');
      google.accounts.id.initialize({client_id: google_client_id, callback: r => login(r.credential).catch(e => setErr(e.message))});
      google.accounts.id.renderButton(btn.current, {theme: 'filled_blue', size: 'large'});
    })().catch(e => setErr(e.message));
  }, []);
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!me) return;
    const f = () => api('/notifications/count').then(r => setUnread(r.count)).catch(() => {});
    f(); const t = setInterval(f, 60000);
    return () => clearInterval(t);
  }, [me]);
  if (!me) return (
    <div style={{maxWidth: 360, margin: '15vh auto', padding: 24, textAlign: 'center'}}>
      <img src={logo} alt="Communifi" style={{width: 300, maxWidth: '100%', borderRadius: 24, boxShadow: '0 14px 30px #c9d9e8'}} />
      <p>Stronger Communities. Smarter Cities.</p>
      <div ref={btn} style={{display: 'flex', justifyContent: 'center'}} />
      <p className="err">{err}</p>
    </div>
  );
  // Admins (web only) get the Dashboard in place of Home, Map, My Reports and Notifications
  const ADMIN_HIDE = ['/', '/map', '/reports', '/notifications'];
  const items = NATIVE ? NAV.filter(n => n[0] !== '/map') : me.is_admin ? [['/admin', 'Dashboard', 'chart'], ...NAV.filter(n => !ADMIN_HIDE.includes(n[0]))] : NAV;
  const initials = (me.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <Ctx.Provider value={{me, q, setUnread}}>
      <HashRouter>
        <div className="app">
          <aside>
            <img className="brand" src={logo} alt="Communifi" />
            <div className="tag-line">Stronger Communities.<br />Smarter Cities.</div>
            {items.map(([to, t, i]) => <NavLink key={to} to={to} end={to === '/'}><Icon n={i} />{t}{to === '/notifications' && unread > 0 && <span className="badge">{unread}</span>}</NavLink>)}
            <div className="side-foot">Cleaner streets • Safer neighborhoods<br />A stronger community.</div>
          </aside>
          <div>
            <div className="top">
              <input placeholder="Search issues, locations, or keywords..." value={q} onChange={e => setQ(e.target.value.toLowerCase())} />
              {!me.is_admin && <Link className="bell" to="/notifications"><Icon n="bell" s={22} />{unread > 0 && <span className="badge">{unread}</span>}</Link>}
              <Link className="user" to="/settings"><span className="av">{initials}</span><span className="uname">{me.name}</span></Link>
            </div>
            <main id="view">
              <Routes>
                <Route path="/" element={me.is_admin ? <Navigate to="/admin" replace /> : <Home />} />
                <Route path="/report" element={<Report />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/issue/:id" element={<Detail />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/map" element={<MapPage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </main>
          </div>
          <nav id="tabs" style={{gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`}}>
            {items.map(([to, t, i]) => <NavLink key={to} to={to} end={to === '/'}><Icon n={i} s={20} />{SHORT[to]}{to === '/notifications' && unread > 0 && <span className="badge">{unread}</span>}</NavLink>)}
          </nav>
        </div>
      </HashRouter>
    </Ctx.Provider>
  );
}
