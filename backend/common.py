import json, math, re
import jwt
from fastapi import Depends, Header, HTTPException
from config import SECRET, BUCKET, ADMINS, CLIENT, WEIGHT, s3
from db import db

ALL = "select i.*, (select count(*) from confirmations where issue_id=i.id and kind='seen') seen from issues i"

# ---------------- auth dependencies ----------------
def me(authorization: str = Header(...)) -> str:
    try: return jwt.decode(authorization.split()[-1], SECRET, algorithms=["HS256"])["sub"]
    except Exception: raise HTTPException(401, "Invalid token")

def is_admin_user(u):
    e = db.execute("select email from users where id=?", (u,)).fetchone()
    return CLIENT.get() != "app" and bool(e and e["email"] in ADMINS)

def admin(u=Depends(me)):
    if not is_admin_user(u): raise HTTPException(403, "Admins only (web)")
    return u

# ---------------- issue rows ----------------
def photo(key):
    return s3.generate_presigned_url("get_object", Params={"Bucket": BUCKET, "Key": key}, ExpiresIn=3600) if key else None

def rows(where, args, u, limit):
    q = f"""select i.*, coalesce(sum(c.kind='seen'),0) seen, coalesce(sum(c.kind='fixed'),0) fixed,
      (select kind from confirmations where issue_id=i.id and user_id=?) mine
      from issues i left join confirmations c on c.issue_id=i.id where {where}
      group by i.id order by i.created_at desc limit ?"""
    out = [{**dict(r), "photo_url": photo(r["photo_key"]), "risks": json.loads(r["risks"] or "[]")} for r in db.execute(q, (u, *args, limit))]
    if not is_admin_user(u):
        for d in out: d.pop("assigned_to", None)
    return out

# ---------------- geo / scoring ----------------
def dist(a, b, c, d):
    p = math.pi / 180
    return 6371000 * math.hypot((d - b) * p * math.cos((a + c) * p / 2), (c - a) * p)
def cell(lat, lng): return f"{lat:.3f},{lng:.3f}"
def near(lat, lng, m, where="1", args=()):
    return [r for r in db.execute(f"select * from issues where {where}", args) if dist(lat, lng, r["lat"], r["lng"]) <= m]
def pressure(r, t):
    return WEIGHT[r["severity"] or "medium"] * (1 + min((t - r["created_at"]) / 86400, 30) / 15) * (1 + 0.2 * (r["seen"] or 0))
def zip_of(b): return b.zip or (re.findall(r"\b(\d{5})(?:-\d{4})?\b", b.address or "") or [None])[-1]
