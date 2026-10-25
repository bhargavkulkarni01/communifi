import re, sqlite3

db = sqlite3.connect("township.db", check_same_thread=False)
db.row_factory = sqlite3.Row
db.executescript("""
create table if not exists users(id text primary key, email text, name text);
create table if not exists issues(id integer primary key autoincrement, user_id text, title text, description text,
  category text, severity text, status text default 'open', photo_key text, address text, lat real, lng real, created_at integer);
create table if not exists updates(id integer primary key autoincrement, issue_id integer, text text, created_at integer);
create table if not exists confirmations(issue_id integer, user_id text, kind text, created_at integer, primary key(issue_id, user_id));
""")
for _c in ("urgency text", "department text", "risks text", "road text", "area text", "cell text"):
    try: db.execute(f"alter table issues add column {_c}")
    except sqlite3.OperationalError: pass
db.execute("update issues set department='Triage' where department='311 Triage'"); db.commit()
for _t in ("issues", "users"):
    try: db.execute(f"alter table {_t} add column zip text")
    except sqlite3.OperationalError: pass
for _t, _c in (("updates", "author text"), ("updates", "kind text default 'status'"), ("updates", "internal integer default 0"), ("issues", "assigned_to text"), ("updates", "note text"), ("updates", "status_to text")):
    try: db.execute(f"alter table {_t} add column {_c}")
    except sqlite3.OperationalError: pass
try: db.execute("alter table users add column notif_seen integer default 0")
except sqlite3.OperationalError: pass
db.execute("create table if not exists forecasts(key text primary key, created_at integer, sig text, body text)")
for _r in db.execute("select id, address from issues where zip is null and address is not null").fetchall():
    _z = re.findall(r"\b(\d{5})(?:-\d{4})?\b", _r["address"])
    if _z: db.execute("update issues set zip=? where id=?", (_z[-1], _r["id"]))
db.commit()
