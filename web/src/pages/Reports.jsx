import {useState} from 'react';
import {Link} from 'react-router-dom';
import {api, useLoad} from '../api';
import {useFilter, EMPTY, Err, Row, Chips} from '../ui';

export default function Reports() {
  const [st, setSt] = useState('');
  const {data, error} = useLoad(() => api('/issues?mine=true' + (st ? '&status=' + st : '')), [st]);
  const rows = useFilter(data || EMPTY);
  return (
    <>
      <h2>My Reports</h2>
      <Chips value={st} onChange={setSt} /><Err e={error} />
      {rows.map(i => <Row key={i.id} i={i} />)}
      {data && !rows.length && <p>No reports here yet. <Link to="/report">Report an issue</Link></p>}
    </>
  );
}
