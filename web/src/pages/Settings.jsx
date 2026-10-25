import {Link} from 'react-router-dom';
import {setToken} from '../api';
import {useApp} from '../ui';
import ZipForm from '../components/ZipForm';

function SettingsPanel({onSaved}) {
  const {me} = useApp();
  return (
    <>
      <ZipForm onSaved={onSaved} />
      <div className="card">
        <b>{me.name}</b><br /><small>{me.email}{me.is_admin ? ' · township admin' : ''}</small>
        {me.is_admin && <p><Link className="btn" to="/admin">Open municipal dashboard</Link></p>}
        <p><button className="btn" onClick={() => window.ReactNativeWebView ? window.ReactNativeWebView.postMessage(JSON.stringify({type: 'logout'})) : (setToken(null), location.reload())}>Sign out</button></p>
      </div>
    </>
  );
}

export default function Settings() {
  return <><h2>Settings</h2><SettingsPanel /></>;
}
