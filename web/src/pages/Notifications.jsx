import {useEffect} from 'react';
import {Link} from 'react-router-dom';
import {api, useLoad, ago} from '../api';
import {useApp, Err} from '../ui';

export default function Notifications() {
  const {data, error} = useLoad(() => api('/notifications'), []);
  const {setUnread} = useApp();
  useEffect(() => { api('/notifications/read', {method: 'POST'}).then(() => setUnread(0)).catch(() => {}); }, []);
  return (
    <>
      <h2>Notifications</h2><br /><Err e={error} />
      {data?.map((x, n) => (
        <Link key={n} className="row" to={`/issue/${x.issue_id}`}>
          <div><b>{x.title}</b><small>{x.text}</small></div><small style={{flex: 'none'}}>{ago(x.created_at)}</small>
        </Link>
      ))}
      {data && !data.length && <p>No updates yet. We will tell you when one of your reports changes.</p>}
    </>
  );
}
