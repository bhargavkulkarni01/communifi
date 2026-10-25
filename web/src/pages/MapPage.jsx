import {useState} from 'react';
import {api, useLoad} from '../api';
import {EMPTY, Err, Row, Chips} from '../ui';
import IssueMap from '../components/IssueMap';

export default function MapPage() {
  const [st, setSt] = useState(''), [pick, setPick] = useState(null);
  const {data, error} = useLoad(() => api('/issues?limit=300'), []);
  return (
    <>
      <h2>Map</h2>
      <Chips value={st} onChange={setSt} /><Err e={error} />
      <IssueMap issues={data || EMPTY} status={st} onPick={setPick} height="58vh" legend />
      {pick && <div style={{marginTop: 10}}><Row i={pick} /></div>}
    </>
  );
}
