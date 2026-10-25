import {useState} from 'react';
import {api, ST} from '../api';
import {Err, opts} from '../ui';

export default function WorkLogForm({issue, onDone}) {
  const [f, setF] = useState({status: issue.status, assigned_to: issue.assigned_to || '', comment: '', share: false});
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const bind = k => ({value: f[k], onChange: e => setF({...f, [k]: e.target.value})});
  const save = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      await api(`/issues/${issue.id}/log`, {method: 'POST', body: {status: f.status, assigned_to: f.assigned_to.trim() || null, comment: f.comment.trim() || null, share: f.share}});
      setF({...f, comment: ''}); onDone();
    } catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <form className="card" onSubmit={save}>
      <h3>Add to work log</h3><Err e={err} />
      <label>Status<select {...bind('status')}>{opts(ST)}</select></label>
      <label>Assigned to<input placeholder="Crew, team or person" maxLength={80} {...bind('assigned_to')} /></label>
      <label>Comment<textarea rows={3} maxLength={1000} placeholder="What was done today, what is next, or what is blocking it?" {...bind('comment')} /></label>
      <label style={{display: 'flex', gap: 8, alignItems: 'center', fontWeight: 400}}>
        <input type="checkbox" style={{width: 'auto'}} checked={f.share} onChange={e => setF({...f, share: e.target.checked})} />Share this comment with the resident
      </label>
      <button className="btn green" disabled={busy}>Save to log</button>
    </form>
  );
}
