import math
from collections import defaultdict
from fastapi import APIRouter, Depends
from common import ALL, me, dist, pressure
from config import CAUSE, SPAN, WEIGHT, Period, now
from db import db

router = APIRouter()

@router.get("/summary")
def summary(u=Depends(me)):
    c = lambda s, since=0: db.execute("select count(*) from issues where status=? and created_at>=?", (s, since)).fetchone()[0]
    w = now() - 7 * 86400; one = lambda q: db.execute(q, (w,)).fetchone()[0]
    return {"open": c("open"), "in_progress": c("in_progress") + c("assigned"), "resolved": c("resolved", now() - SPAN["month"]),
            "open_new": one("select count(*) from issues where status='open' and created_at>?"),
            "resolved_week": one("select count(*) from updates where (text='Resolved' or status_to='resolved') and created_at>?"),
            "started_week": one("select count(*) from updates where (text='Work started' or status_to='in_progress') and created_at>?"),
            "confirmations": db.execute("select count(*) from confirmations where kind='seen'").fetchone()[0],
            "confirmations_week": one("select count(*) from confirmations where kind='seen' and created_at>?")}

@router.get("/stats")
def stats(period: Period = "week", u=Depends(me)):
    r = db.execute("select category, severity, count(*) n from issues where created_at>=? group by 1,2", (now() - SPAN[period],))
    return [dict(x) for x in r]

@router.get("/score")
def score(u=Depends(me)):
    t = now(); by = defaultdict(lambda: {"open": 0, "p": 0.0, "res": 0, "new": 0, "prev": 0})
    for r in db.execute(ALL):
        a = by[r["area"] or "Unassigned"]
        if r["status"] != "resolved": a["open"] += 1; a["p"] += pressure(r, t)
        elif r["created_at"] > t - 30 * 86400: a["res"] += 1
        if r["created_at"] > t - 30 * 86400: a["new"] += 1
        elif r["created_at"] > t - 60 * 86400: a["prev"] += 1
    out = [{"area": k, "open": v["open"], "score": max(0, min(100, round(100 - v["p"] * 2 + min(v["res"], 10)))),
            "trend": "worsening" if v["new"] > v["prev"] else "improving" if v["new"] < v["prev"] else "steady"} for k, v in by.items()]
    return sorted(out, key=lambda x: x["score"])

@router.get("/alerts")
def alerts(u=Depends(me)):
    rs = db.execute("select * from issues where status!='resolved' and created_at>?", (now() - 14 * 86400,)).fetchall(); done = set(); out = []
    for r in rs:
        if r["id"] in done: continue
        g = [x for x in rs if x["department"] == r["department"] and dist(r["lat"], r["lng"], x["lat"], x["lng"]) <= 150]
        if len(g) >= 3 or sum(x["severity"] == "high" for x in g) >= 2:
            done.update(x["id"] for x in g)
            out.append({"area": r["area"] or r["address"], "department": r["department"], "count": len(g), "lat": r["lat"], "lng": r["lng"],
                        "hint": f"{len(g)} related reports within 150 m in 14 days. Possible {CAUSE[r['category']]}."})
    return out

@router.get("/predictions")
def predictions(u=Depends(me)):
    t = now(); by = defaultdict(list)
    for r in db.execute("select * from issues where created_at>?", (t - 365 * 86400,)): by[r["cell"]].append(r)
    out = []
    for c, g in by.items():
        if len(g) < 2: continue
        rec = sum(1 / (1 + (t - r["created_at"]) / (90 * 86400)) for r in g); sev = sum(WEIGHT[r["severity"]] for r in g) / len(g)
        cats = [r["category"] for r in g]
        out.append({"area": g[-1]["area"], "road": g[-1]["road"], "lat": g[-1]["lat"], "lng": g[-1]["lng"], "likely": max(set(cats), key=cats.count),
                    "history": len(g), "risk": min(99, round(100 * (1 - math.exp(-0.35 * rec * (0.6 + sev / 5)))))})
    return sorted(out, key=lambda x: -x["risk"])[:10]
