import {Link, useNavigate} from 'react-router-dom';
import {api, useLoad} from '../api';
import {useApp, useFilter, EMPTY, NATIVE, Err, Row, Icon, StatCard, statCards} from '../ui';
import IssueMap from '../components/IssueMap';
import Insights from '../components/Insights';

export default function Home() {
  const {me} = useApp();
  const {data, error} = useLoad(() => Promise.all([api('/summary'), api('/issues?limit=100')]), []);
  const [sm, all] = data || [];
  const recent = useFilter(all || EMPTY).slice(0, 5);
  const nav = useNavigate();
  return (
    <>
      <section className="hero">
        <div>
          <small className="eyebrow">WELCOME BACK, {(me.name || '').split(' ')[0].toUpperCase()}</small>
          <h2>Stronger Communities, Together</h2>
          <p>Report issues, get updates, and help make your town a better place.</p>
          <Link className="btn green" to="/report">Report an Issue <Icon n="plus" s={16} /></Link>
        </div>
      </section>
      <Err e={error} />
      <div className="stats">
        {sm && statCards(sm).map(s => <StatCard key={s[0]} s={s} to={s[0] === 'seen' && !NATIVE ? '/map' : '/reports'} />)}
      </div>
      <Insights />
      <div className="cols">
        <div className="card">
          <div className="sh"><h3>Recent Issues</h3><Link to="/reports">View All →</Link></div>
          <div style={{marginTop: 10}}>{recent.map(i => <Row key={i.id} i={i} />)}{all && !recent.length && <p>No issues match yet.</p>}</div>
        </div>
        <div className="card">
          <div className="sh"><h3>Issues Near You</h3>{!NATIVE && <Link to="/map">View Map →</Link>}</div>
          <div style={{marginTop: 10}}><IssueMap issues={all || EMPTY} onPick={i => nav('/issue/' + i.id)} legend /></div>
        </div>
      </div>
    </>
  );
}
