import json, uuid, difflib
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from common import me, admin, is_admin_user, photo, rows, dist, cell, near, zip_of
from config import BUCKET, DEPT, LABEL, SPAN, STATUS_NAME, Period, Status, now, s3
from db import db

router = APIRouter()

class Issue(BaseModel):
    title: str; description: str
    category: Literal["roads", "streetlights", "parks", "sanitation", "other"]
    severity: Literal["low", "medium", "high"]
    photo_key: str | None = None; address: str | None = None; lat: float; lng: float
    urgency: Literal["routine", "soon", "urgent", "emergency"] = "routine"
    risks: list[str] = []; road: str | None = None; area: str | None = None; zip: str | None = None
class StatusIn(BaseModel): status: Status
class Dup(BaseModel):
    lat: float; lng: float; category: str; text: str = ""
class Conf(BaseModel):
    kind: Literal["seen", "fixed"] | None
class LogIn(BaseModel):
    status: Status | None = None; assigned_to: str | None = None; comment: str | None = None; share: bool = False

@router.post("/uploads/presign")
def presign(u=Depends(me)):
    key = f"issues/{u}/{uuid.uuid4()}.jpg"
    url = s3.generate_presigned_url("put_object", ExpiresIn=300,
        Params={"Bucket": BUCKET, "Key": key, "ContentType": "image/jpeg"})
    return {"upload_url": url, "key": key}

@router.post("/issues")
def create(b: Issue, u=Depends(me)):
    cur = db.execute("insert into issues(user_id,title,description,category,severity,urgency,department,risks,photo_key,address,road,area,cell,lat,lng,created_at,zip) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        (u, b.title, b.description, b.category, b.severity, b.urgency, DEPT[b.category], json.dumps(b.risks[:3]), b.photo_key, b.address, b.road, b.area, cell(b.lat, b.lng), b.lat, b.lng, now(), zip_of(b)))
    db.execute("insert into updates(issue_id,text,created_at) values(?,?,?)", (cur.lastrowid, f"Reported and routed to {DEPT[b.category]}", now()))
    db.commit(); return {"id": cur.lastrowid}

@router.get("/issues")
def issues(period: Period | None = None, status: Status | None = None, mine: bool = False, limit: int = 100, u=Depends(me)):
    w, a = ["1"], []
    if period: w.append("i.created_at>=?"); a.append(now() - SPAN[period])
    if status: w.append("i.status=?"); a.append(status)
    if mine: w.append("i.user_id=?"); a.append(u)
    return rows(" and ".join(w), a, u, min(limit, 300))

@router.get("/issues/{iid}")
def detail(iid: int, u=Depends(me)):
    r = rows("i.id=?", (iid,), u, 1)
    if not r: raise HTTPException(404, "Issue not found")
    adm = is_admin_user(u)
    r[0]["updates"] = [dict(x) for x in db.execute("select text, created_at, author, kind, internal" + (", note" if adm else "") + " from updates where issue_id=?" + ("" if adm else " and coalesce(internal,0)=0") + " order by created_at desc, id desc", (iid,))]
    return r[0]

@router.post("/issues/{iid}/status")
def set_status(iid: int, b: StatusIn, u=Depends(me)):
    if not is_admin_user(u): raise HTTPException(403, "Admins only (web)")
    db.execute("update issues set status=? where id=?", (b.status, iid))
    db.execute("insert into updates(issue_id,text,created_at,status_to) values(?,?,?,?)", (iid, LABEL[b.status], now(), b.status))
    db.commit(); return {"ok": True}

@router.post("/issues/duplicates")
def duplicates(b: Dup, u=Depends(me)):
    out = []
    for r in near(b.lat, b.lng, 100, "status!='resolved'"):
        d = dist(b.lat, b.lng, r["lat"], r["lng"]); same = r["category"] == b.category
        sim = difflib.SequenceMatcher(None, b.text.lower(), (r["title"] + " " + r["description"]).lower()).ratio()
        out.append({"id": r["id"], "title": r["title"], "address": r["address"], "category": r["category"], "same_category": same, "status": r["status"],
                    "distance_m": round(d), "created_at": r["created_at"], "photo_url": photo(r["photo_key"]),
                    "score": round(max(0, 1 - d / 100) * .45 + sim * .3 + (.25 if same else 0), 2)})
    pts = db.execute("select lat, lng from issues where status!='resolved' and lat is not null").fetchall()
    nearest = min((dist(b.lat, b.lng, p["lat"], p["lng"]) for p in pts), default=None)
    print(f"dup-check pin=({b.lat:.5f},{b.lng:.5f}) matches={len(out)} nearest_m={None if nearest is None else round(nearest)}")
    return {"matches": sorted(out, key=lambda x: -x["score"])[:5], "nearest_m": None if nearest is None else round(nearest)}

@router.post("/issues/{iid}/confirm")
def confirm(iid: int, b: Conf, u=Depends(me)):
    if b.kind is None: db.execute("delete from confirmations where issue_id=? and user_id=?", (iid, u))
    else: db.execute("insert or replace into confirmations values(?,?,?,?)", (iid, u, b.kind, now()))
    if db.execute("select count(*) from confirmations where issue_id=? and kind='fixed'", (iid,)).fetchone()[0] == 3:
        db.execute("insert into updates(issue_id,text,created_at) values(?,?,?)", (iid, "3 residents say this is fixed. Awaiting staff verification", now()))
    db.commit(); return {"ok": True}

@router.get("/issues/{iid}/memory")
def memory(iid: int, u=Depends(me)):
    i = db.execute("select * from issues where id=?", (iid,)).fetchone()
    if not i: raise HTTPException(404, "Issue not found")
    h = sorted(near(i["lat"], i["lng"], 100, "id!=?", (iid,)), key=lambda r: -r["created_at"])
    return {"total": len(h), "same_category": sum(r["category"] == i["category"] for r in h),
            "history": [{k: r[k] for k in ("id", "title", "category", "status", "created_at")} for r in h[:8]]}

@router.post("/issues/{iid}/log")
def work_log(iid: int, b: LogIn, u=Depends(admin)):
    i = db.execute("select status, assigned_to from issues where id=?", (iid,)).fetchone()
    if not i: raise HTTPException(404, "Issue not found")
    who = db.execute("select name from users where id=?", (u,)).fetchone()["name"]
    to = (b.assigned_to or "").strip()[:80]; comment = (b.comment or "").strip()[:1000]
    if b.status == "assigned" and not (to or i["assigned_to"]): raise HTTPException(422, "Add who this is assigned to")
    public, note, new_status = [], [], None
    if to and to != (i["assigned_to"] or ""):
        db.execute("update issues set assigned_to=? where id=?", (to, iid)); note.append(f"Assigned to {to}")
    if b.status and b.status != i["status"]:
        db.execute("update issues set status=? where id=?", (b.status, iid)); public.append(f"Status changed to {STATUS_NAME[b.status]}."); new_status = b.status
    if comment: (public if b.share else note).append(comment)
    if not public and not note: raise HTTPException(422, "Nothing to save")
    # one consolidated row per save: resident-visible text only, admin-only note kept separate
    db.execute("insert into updates(issue_id,text,created_at,author,kind,internal,note,status_to) values(?,?,?,?,?,?,?,?)",
               (iid, " ".join(public), now(), who, "log", 0 if public else 1, " · ".join(note) or None, new_status))
    db.commit(); return {"ok": True}
