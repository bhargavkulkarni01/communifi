const dayName = t => {
  const d = new Date(t * 1000), k = x => x.toDateString();
  return k(d) === k(new Date()) ? 'Today' : k(d) === k(new Date(Date.now() - 864e5)) ? 'Yesterday' : d.toLocaleDateString(undefined, {weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'});
};

export default function Timeline({items}) {
  const groups = [];
  for (const u of items) {
    const d = dayName(u.created_at); let g = groups[groups.length - 1];
    if (!g || g.d !== d) { g = {d, list: []}; groups.push(g); }
    g.list.push(u);
  }
  return groups.map(g => (
    <div key={g.d} className="logday"><h4>{g.d}</h4>
      {g.list.map((u, n) => (
        <p key={n} className={u.internal ? 'internal' : ''}>
          <small>{new Date(u.created_at * 1000).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})}{u.author ? ` · ${u.author}` : ''}{u.internal ? ' · internal note' : ''}</small><br />{u.text}{u.text && u.note && <br />}{u.note && <i>Internal: {u.note}</i>}
        </p>
      ))}
    </div>
  ));
}
