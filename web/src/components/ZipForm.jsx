import {useState} from 'react';
import {api} from '../api';
import {useApp} from '../ui';

export default function ZipForm({onSaved}) {
  const {me} = useApp(), [z, setZ] = useState(me.zip || ''), [msg, setMsg] = useState('');
  const save = e => {
    e.preventDefault();
    api('/me/zip', {method: 'POST', body: {zip: z}}).then(r => { setMsg(r.zip ? `Saved. Watch alerts will cover ${r.zip}.` : 'ZIP removed.'); onSaved?.(); }).catch(x => setMsg(x.message));
  };
  return (
    <form className="card" onSubmit={save}>
      <label>Your ZIP code (for watch alerts)<input inputMode="numeric" maxLength={5} placeholder="e.g. 08817" value={z} onChange={e => setZ(e.target.value)} /></label>
      <button className="btn green" type="submit">Save</button> <small>{msg}</small>
    </form>
  );
}
