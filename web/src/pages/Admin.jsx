import {useState} from 'react';
import {Link} from 'react-router-dom';
import {api, useLoad, authHeader, ST} from '../api';
import {useApp, Err, opts, StatCard, statCards} from '../ui';
import AdminForecast from '../components/AdminForecast';

const QLABEL = {open: 'Open', in_progress: 'In Progress', resolved: 'Resolved (last 30 days)'};

export default function Admin() {
  const {me} = useApp(), [tick, setTick] = useState(0), [sel, setSel] = useState('open');
  const [fz, setFz] = useState({zip: '', refresh: false});
  const qs = new URLSearchParams({...(fz.zip && {zip: fz.zip}), ...(fz.refresh && {refresh: 'true'})}).toString();
  const q = useLoad(() => api('/admin/queue?status=' + sel), [sel, tick]), sm = useLoad(() => api('/summary'), [tick]), al = useLoad(() => api('/alerts'), []);
  const fc = useLoad(() => api('/admin/forecast' + (qs ? '?' + qs : '')), [fz]);
  if (!me.is_admin) return <p>Admins only.</p>;
  const setStatus = (id, status) => api(`/issues/${id}/status`, {method: 'POST', body: {status}}).then(() => setTick(t => t + 1)).catch(e => alert(e.message));
  const csv = async () => { const x = await fetch('/admin/export.csv', {headers: authHeader()}); const a = document.createElement('a'); a.href = URL.createObjectURL(await x.blob()); a.download = 'veranda_issues.csv'; a.click(); };
  const trends = fc.data?.trends;
  return (
    <>
      <div className="sh"><h2>Municipal Dashboard</h2><button className="btn" onClick={csv}>Export CSV</button></div><Err e={q.error || sm.error} />
      <div className="card warn"><b>Early warning</b>
        {al.data?.length ? al.data.map((x, n) => <p key={n} style={{margin: '6px 0 0'}}><b>{x.area || x.department}</b><br /><small>{x.hint}</small></p>)
          : <><br /><small>{al.data ? 'No clusters detected in the last 14 days.' : 'Checking for clusters…'}</small></>}
      </div>
      <div className="card info"><b>Trends{fc.data ? ` · ${fc.data.scope}` : ''}</b>
        {trends?.length ? <ul>{trends.map((t, n) => <li key={n}>{t}</li>)}</ul>
          : <><br /><small>{fc.data ? 'No trends yet. They appear as the AI forecast finds patterns.' : fc.error ? 'Forecast unavailable.' : 'Generating forecast…'}</small></>}
      </div>
      <div className="stats three">
        {sm.data && statCards(sm.data).filter(s => QLABEL[s[0]]).map(s => <StatCard key={s[0]} s={s} on={sel === s[0]} onClick={() => setSel(s[0])} />)}
      </div>
      <div className="card" style={{overflowX: 'auto'}}><h3>Priority queue · {QLABEL[sel]}</h3>
        {q.data && !q.data.length && <small>No {QLABEL[sel].toLowerCase()} issues.</small>}
        {q.data?.length > 0 && <table><thead><tr><th>Priority</th><th>Issue</th><th>Dept</th><th>Urgency</th><th>Seen</th><th>Status</th></tr></thead>
          <tbody>{q.data.map(i => <tr key={i.id}><td><b>{i.priority}</b></td><td><Link to={`/issue/${i.id}`}>{i.title}</Link><br /><small>{i.address}</small>{i.assigned_to && <><br /><small>Assigned: {i.assigned_to}</small></>}</td>
            <td>{i.department}</td><td>{i.urgency}</td><td>{i.seen}</td>
            <td><select value={i.status} onChange={e => setStatus(i.id, e.target.value)}>{opts(ST)}</select></td></tr>)}</tbody></table>}
      </div>
      <AdminForecast f={fc.data} error={fc.error} onForecast={zip => setFz({zip, refresh: false})} onRefresh={() => setFz({...fz, refresh: true})} />
    </>
  );
}
