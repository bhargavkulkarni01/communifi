import {useState} from 'react';
import {Err, LV, Bul, wrap} from '../ui';

// Compact forecast: one line per area, details on demand. Trends are shown separately at the top of the Dashboard.
export default function AdminForecast({f, error, onForecast, onRefresh}) {
  const [zq, setZq] = useState('');
  return (
    <div className="card">
      <div className="sh"><h3>AI forecast{f && f.source !== 'ai' ? ' (rule-based)' : ''}{f ? ` · ${f.scope}` : ''}</h3>
        <form className="fz" onSubmit={e => { e.preventDefault(); onForecast(zq.trim()); }}>
          <input placeholder="ZIP (blank = all)" maxLength={5} value={zq} onChange={e => setZq(e.target.value)} />
          <button className="btn" type="submit">Go</button>
          <button className="btn" type="button" onClick={onRefresh}>Refresh</button>
        </form>
      </div>
      <Err e={error} />
      {!f && !error && <small>Generating forecast…</small>}
      {f && <>
        <p style={{margin: '8px 0'}}>{f.summary}</p>{f.confidence_note && <small>{f.confidence_note}</small>}
        {f.areas?.map((a, n) => (
          <details className="fa" key={n}>
            <summary>
              <span><b>{a.location}</b><small style={wrap}>{a.predicted_issue}</small></span>
              <span className={`pill ${LV[a.risk_level] ?? ''}`}>{a.risk_level} · {a.likelihood_pct}%</span>
            </summary>
            <small style={wrap}>{a.window} · {a.department} · Effort: {a.effort}</small>
            <Bul t="Likely causes" items={a.likely_causes} /><Bul t="Evidence" items={a.evidence} /><Bul t="Recommended actions" items={a.recommended_actions} />
          </details>
        ))}
      </>}
    </div>
  );
}
