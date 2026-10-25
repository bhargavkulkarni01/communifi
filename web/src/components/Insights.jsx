import {Link} from 'react-router-dom';
import {api, useLoad} from '../api';
import {LV, wrap} from '../ui';

function Watch() {
  const {data} = useLoad(() => api('/forecast'), []);
  if (!data) return null;
  if (data.needs_zip) return <div className="card warn"><b>Get watch alerts for your area</b><br /><small>Add your ZIP code in <Link to="/settings">Settings</Link> and Communifi will warn you about problems likely to appear nearby.</small></div>;
  return (
    <div className="card">
      <div className="sh"><h3>Watch alert · {data.zip}</h3><small>{data.source === 'ai' ? 'AI forecast' : 'Based on repeat reports'}</small></div>
      <p>{data.summary}</p>
      {data.watch.map((w, n) => (
        <div key={n} className="row" style={{alignItems: 'flex-start'}}>
          <div><b style={wrap}>{w.title}</b><small style={wrap}>{w.why}</small><small style={wrap}>Tip: {w.tip}</small></div>
          <span className={`pill ${LV[w.likelihood] ?? ''}`}>{w.likelihood} · {w.window}</span>
        </div>
      ))}
    </div>
  );
}

export default function Insights() {
  const {data: sc} = useLoad(() => api('/score'), []), {data: al} = useLoad(() => api('/alerts'), []);
  return (
    <>
      <Watch />
      {al?.slice(0, 2).map((x, n) => <div key={n} className="card warn"><b>Early warning · {x.area || x.department}</b><br /><small>{x.hint}</small></div>)}
      {sc?.length > 0 && <div className="card"><h3>Community Score by area</h3>
        {sc.slice(0, 5).map(x => (
          <div key={x.area} className="score"><span>{x.area}</span>
            <div className="bar"><i style={{width: x.score + '%', background: x.score > 70 ? '#2EAF5B' : x.score > 40 ? '#e0a21f' : '#e5484d'}} /></div>
            <b>{x.score}</b><small>{x.trend}</small></div>
        ))}</div>}
    </>
  );
}
