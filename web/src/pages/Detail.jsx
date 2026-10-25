import {useState} from 'react';
import {Link, useParams} from 'react-router-dom';
import {api, useLoad, ST, CAT, ago} from '../api';
import {useApp, Err} from '../ui';
import Timeline from '../components/Timeline';
import WorkLogForm from '../components/WorkLogForm';

export default function Detail() {
  const {id} = useParams(), {me} = useApp();
  const [tick, setTick] = useState(0), reload = () => setTick(t => t + 1);
  const {data: i, error} = useLoad(() => api('/issues/' + id), [id, tick]);
  const {data: mem} = useLoad(() => api(`/issues/${id}/memory`), [id]);
  const post = (path, body) => api(`/issues/${id}/${path}`, {method: 'POST', body}).then(reload).catch(e => alert(e.message));
  if (error) return <Err e={error} />;
  if (!i) return null;
  const pick = k => post('confirm', {kind: i.mine === k ? null : k});
  return (
    <>
      <Link to="/reports">← Back</Link>
      <div className="card" style={{marginTop: 10}}>
        {i.photo_url && <img src={i.photo_url} alt="" style={{width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 8}} />}
        <p><span className={`pill ${i.status}`}>{ST[i.status]}</span> <span className="pill resolved">{i.urgency || 'routine'}</span></p>
        <h2>{i.title}</h2>
        <small>{i.road || i.address || CAT[i.category]} · {ago(i.created_at)} · {i.severity} severity · {i.department}</small>
        <p>{i.description}</p>
        {i.risks.length > 0 && <p><b>Possible risks</b><br />{i.risks.map(r => <span key={r} className="pill open" style={{marginRight: 6}}>{r}</span>)}</p>}
        <div className="votes">
          <button className={`chip ${i.mine === 'seen' ? 'on' : ''}`} onClick={() => pick('seen')}>I see this too · {i.seen}</button>
          <button className={`chip ${i.mine === 'fixed' ? 'on' : ''}`} onClick={() => pick('fixed')}>It's fixed · {i.fixed}</button>
        </div>
        {me.is_admin && i.assigned_to && <p><small>Assigned to <b>{i.assigned_to}</b></small></p>}
      </div>
      <div className="card tl"><h3>{me.is_admin ? 'Work log' : 'Updates'}</h3><Timeline items={i.updates} /></div>
      {me.is_admin && <WorkLogForm key={i.id} issue={i} onDone={reload} />}
      {mem && <div className="card">
        <h3>Civic memory</h3>
        <p>{mem.total ? `${mem.total} other report${mem.total > 1 ? 's' : ''} within 100 m, ${mem.same_category} in this category.` : 'No earlier reports at this location.'}</p>
        {mem.history.map(h => (
          <Link key={h.id} className="row" to={`/issue/${h.id}`}><div><b>{h.title}</b><small>{CAT[h.category]}</small></div>
            <span className={`pill ${h.status}`}>{ST[h.status]}</span><small style={{flex: 'none'}}>{ago(h.created_at)}</small></Link>
        ))}
      </div>}
    </>
  );
}
