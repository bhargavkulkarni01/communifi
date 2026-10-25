import {useEffect, useMemo, useRef, useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {api, ST, CAT, ago} from '../api';
import {Err, opts} from '../ui';
import PickMap from '../components/PickMap';

const Preview = ({file}) => {
  const url = useMemo(() => file && URL.createObjectURL(file), [file]);
  return url ? <img src={url} alt="" style={{maxWidth: '100%', maxHeight: 240, borderRadius: 8}} /> : null;
};
const toJpeg = async (file, max = 1280) => {
  const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok, no) => c.toBlob(b => (b ? ok(b) : no(Error('convert failed'))), 'image/jpeg', 0.85));
};
const DEPT = {roads: 'Public Works - Roads', streetlights: 'Public Works - Electrical', parks: 'Parks & Recreation', sanitation: 'Sanitation', other: 'Triage'};
const SEV = {low: 'Low', medium: 'Medium', high: 'High'};

export default function Report() {
  const [r, setR] = useState({step: 1, description: '', file: null, pin: null, address: '', road: '', area: '', key: null, ai: null, dups: null});
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false), nav = useNavigate();
  const cam = useRef(), gal = useRef(), native = !!window.NATIVE_ID_TOKEN;
  const pickFile = e => { const f = e.target.files[0]; e.target.value = ''; load(f); };
  const load = async f => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return setErr('Please choose an image file (JPG, PNG, etc.).');
    try { set({file: await toJpeg(f), key: null, ai: null}); setErr(''); } catch { setErr('Could not read that image. Try another photo.'); }
  };
  const set = p => setR(x => ({...x, ...p})), setAi = p => setR(x => ({...x, ai: {...x.ai, ...p}}));
  const next = () => {
    const e = r.step === 1 && !r.description.trim() ? 'Describe the problem.' : r.step === 2 && !r.pin ? 'Tap the map to drop a pin.' : '';
    setErr(e); if (!e) set({step: r.step + 1});
  };
  useEffect(() => {
    if (r.step !== 3 || r.ai) return;
    (async () => {
      let key = r.key;
      if (r.file && !key) {
        const u = await api('/uploads/presign', {method: 'POST'});
        const up = await fetch(u.upload_url, {method: 'PUT', headers: {'Content-Type': 'image/jpeg'}, body: r.file}).catch(() => { throw Error('Photo upload blocked. Check the S3 bucket CORS rule and that AWS_REGION matches the bucket region.'); });
        if (!up.ok) throw Error('Photo upload failed');
        key = u.key;
      }
      const ai = await api('/ai/analyze', {method: 'POST', body: {description: r.description, photo_key: key}});
      set({key, ai, dups: null});
    })().catch(e => setErr(e.message));
  }, [r.step]);
  useEffect(() => {
    if (!r.ai) return;
    api('/issues/duplicates', {method: 'POST', body: {lat: r.pin.lat, lng: r.pin.lng, category: r.ai.category, text: r.ai.title + ' ' + r.description}})
      .then(d => set({dups: d.matches, nearest: d.nearest_m})).catch(e => setErr(e.message));
  }, [r.ai?.category, !!r.ai]);
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const a = r.ai;
      const {id} = await api('/issues', {method: 'POST', body: {title: a.title, description: r.description, category: a.category, severity: a.severity,
        urgency: a.urgency, risks: a.risks, photo_key: r.key, address: r.address || null, road: r.road || null, area: r.area || null, zip: r.zip || null, lat: r.pin.lat, lng: r.pin.lng}});
      nav('/issue/' + id);
    } catch (e) { setErr(e.message); setBusy(false); }
  };
  const same = d => api(`/issues/${d.id}/confirm`, {method: 'POST', body: {kind: 'seen'}}).then(() => nav('/issue/' + d.id)).catch(e => setErr(e.message));
  const a = r.ai;
  return (
    <>
      <h2>Report an Issue</h2>
      <small>Snap a photo and describe it. Communifi works out the rest.</small>
      <div className="steps">{['Photo & details', 'Location', 'AI review'].map((n, k) => <span key={n} className={k + 1 === r.step ? 'on' : ''}>{k + 1}. {n}</span>)}</div>
      <Err e={err} />
      <div className="card">
        {r.step === 1 && <>
          <b>Photo</b>
          <div className="drop" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); load(e.dataTransfer.files[0]); }}>
            {!native && <small>Drag a photo here, or</small>}
            <div style={{display: 'flex', gap: 8, justifyContent: 'center', margin: '8px 0 0'}}>
              {native && <button type="button" className="btn" onClick={() => cam.current.click()}>Take photo</button>}
              <button type="button" className="btn" onClick={() => gal.current.click()}>{native ? 'Choose from gallery' : 'Upload photo'}</button>
            </div>
          </div>
          <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={pickFile} />
          <input ref={gal} type="file" accept="image/*" hidden onChange={pickFile} />
          <Preview file={r.file} />
          <label>What's wrong?<textarea rows={4} maxLength={500} placeholder="e.g. Large pothole near the crosswalk, cars swerving around it" value={r.description} onChange={e => set({description: e.target.value, ai: null})} /></label>
        </>}
        {r.step === 2 && <PickMap pin={r.pin} address={r.address} onPick={(pin, address, road, area, zip) => set({pin, address, road, area, zip, ai: null})} />}
        {r.step === 3 && (!a ? <p>Analysing your report…</p> : <>
          <h3>AI understood your report</h3>
          <label>Title<input value={a.title} onChange={e => setAi({title: e.target.value})} /></label>
          <label>Category<select value={a.category} onChange={e => setAi({category: e.target.value})}>{opts(CAT)}</select></label>
          <label>Severity<select value={a.severity} onChange={e => setAi({severity: e.target.value})}>{opts(SEV)}</select></label>
          <p><small>Urgency: <b>{a.urgency}</b> · Routed to: <b>{DEPT[a.category]}</b>{r.road ? ` · ${r.road}` : ''}</small></p>
          {a.source === 'fallback' && <p className="err"><small>AI analysis unavailable ({a.ai_error}), so a basic keyword match was used. See the backend log for details.</small></p>}
          {a.risks.length > 0 && <p>{a.risks.map(x => <span key={x} className="pill open" style={{marginRight: 6}}>{x}</span>)}</p>}
          <h3>Is this already reported nearby?</h3>
          <small>Your pin: {r.pin.lat.toFixed(5)}, {r.pin.lng.toFixed(5)}</small>
          {r.dups === null ? <small>Checking for reports within 100 m…</small> : r.dups.length === 0 ? <small>No open reports within 100 m{r.nearest != null ? ` (the nearest open report is ${r.nearest} m away)` : ''}. This will be filed as a new issue.</small> : <>
            <small>Open reports within 100 m of your pin. If one matches, confirm it instead of filing a duplicate.</small>
            {r.dups.map(d => (
              <div className="row" key={d.id} style={{marginTop: 8}}>
                {d.photo_url ? <img src={d.photo_url} alt="" /> : <span className="ph" />}
                <div><b>{d.title}</b><small>{d.distance_m} m away · {CAT[d.category]}{d.same_category ? '' : ' (different category)'} · {ST[d.status]} · {ago(d.created_at)}</small></div>
                <button className="btn green" onClick={() => same(d)}>Same issue</button>
              </div>
            ))}
          </>}
        </>)}
      </div>
      <div className="nav2">
        {r.step > 1 ? <button className="btn" onClick={() => set({step: r.step - 1})}>Back</button> : <Link className="btn" to="/">Cancel</Link>}
        {r.step < 3 ? <button className="btn green" onClick={next}>Next</button> : <button className="btn green" disabled={busy || !a || r.dups === null} onClick={submit}>{r.dups?.length ? 'This is a new issue, submit' : 'Submit report'}</button>}
      </div>
    </>
  );
}
