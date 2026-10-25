import {createContext, useContext} from 'react';
import {Link} from 'react-router-dom';
import {ST, CAT, ago} from './api';

export const P = {
  home: 'M3 11l9-8 9 8v10h-6v-6H9v6H3z', plus: 'M12 5v14M5 12h14', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14', bell: 'M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 004 0',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-2-4-2 1-2-1-1-2H9L8 7 6 8 4 7 2 11l2 1v2l-2 1 2 4 2-1 2 1 1 2h4l1-2 2-1 2 1 2-4-2-1z',
  check: 'M5 12l5 5 9-10', chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
};
export const Icon = ({n, s = 20}) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={P[n]} /></svg>
);
export const Logo = () => (
  <svg viewBox="0 0 40 40"><path d="M20 3a9 9 0 019 9c0 7-9 14-9 14S11 19 11 12a9 9 0 019-9z" fill="#fff" /><circle cx="20" cy="12" r="3.4" fill="#1679B8" /><path d="M6 24c8 0 14 4 14 14C12 38 6 32 6 24zM34 24c0 8-6 14-14 14 0-10 6-14 14-14z" fill="#16A66A" /></svg>
);
export const Ctx = createContext();
export const useApp = () => useContext(Ctx);
export const EMPTY = [];
export const NATIVE = !!window.NATIVE_ID_TOKEN; // true inside the resident mobile app
export const Err = ({e}) => (e ? <p className="err">{e.message || e}</p> : null);
export const useFilter = a => {
  const {q} = useApp();
  return a.filter(i => (i.title + ' ' + (i.address || '')).toLowerCase().includes(q));
};
export const PRI = {high: 'High Priority', medium: 'Medium', low: 'Low'};
export const SHORT_CAT = {roads: 'Roads', streetlights: 'Lighting', parks: 'Parks', sanitation: 'Sanitation', other: 'Other'};
export const Row = ({i}) => (
  <Link className="row" to={`/issue/${i.id}`}>
    {i.photo_url ? <img src={i.photo_url} alt="" /> : <span className="ph" />}
    <div>
      <b>{i.title}</b><small>{i.address || CAT[i.category]}</small>
      <span className="tags"><span className={`tag ${i.severity}`}>{PRI[i.severity]}</span><span className="tag dept">{SHORT_CAT[i.category] || 'Other'}</span></span>
    </div>
    <div style={{flex: 'none', textAlign: 'right'}}><small>{ago(i.created_at)}</small><span className={`pill ${i.status}`}>{ST[i.status]}</span></div>
    <span className="dots">⋮</span>
  </Link>
);

export const Chips = ({value, onChange}) => (
  <div className="chips">
    {[['', 'All'], ...Object.entries(ST)].map(([k, v]) => (
      <button key={k} className={`chip ${value === k ? 'on' : ''}`} onClick={() => onChange(k)}>{v}</button>
    ))}
  </div>
);
// Summary cards shared by Home and the admin Dashboard: [key, count, label, delta, delta class, colour, icon]
export const statCards = sm => [
  ['open', sm.open, 'Open Issues', sm.open_new ? `${sm.open_new} new this week` : 'No new this week', sm.open_new ? 'warn' : '', '#22b573', 'list'],
  ['resolved', sm.resolved, 'Resolved', `${sm.resolved_week} this week`, sm.resolved_week ? 'up' : '', '#2f80ed', 'check'],
  ['in_progress', sm.in_progress, 'In Progress', sm.started_week ? `${sm.started_week} this week` : 'No change', '', '#8b5cf6', 'gear'],
  ['seen', sm.confirmations, 'Community Confirmations', `${sm.confirmations_week} this week`, sm.confirmations_week ? 'up' : '', '#14b8a6', 'check'],
];
export const StatCard = ({s: [k, n, t, d, cls, c, i], to, on, onClick}) => {
  const body = <><span className="bub" style={{background: c + '26', color: c}}><Icon n={i} s={22} /></span>
    <div><b>{n}</b><small>{t}</small><span className={`delta ${cls}`}>{d}</span></div><span className="chev">›</span></>;
  const cn = `card stat ${k === 'seen' ? 'teal' : ''} ${on ? 'on' : ''}`;
  return to ? <Link to={to} className={cn}>{body}</Link> : <button type="button" className={cn} aria-pressed={on} onClick={onClick}>{body}</button>;
};
export const opts = o => Object.entries(o).map(([k, v]) => <option key={k} value={k}>{v}</option>);
export const LV = {low: 'resolved', medium: 'in_progress', high: 'open', critical: 'open'};
export const Bul = ({t, items}) => (items?.length ? <><p /><b>{t}</b><ul>{items.map((x, n) => <li key={n}>{x}</li>)}</ul></> : null);
export const wrap = {whiteSpace: 'normal'};
