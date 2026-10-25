import csv, io
from typing import Literal
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from common import ALL, admin, pressure
from config import SPAN, URG, now
from db import db

router = APIRouter()

# Same groupings as /summary, so the dashboard cards and the queue agree
QUEUE = {"open": (("open",), 0), "in_progress": (("in_progress", "assigned"), 0), "resolved": (("resolved",), SPAN["month"])}

@router.get("/admin/queue")
def queue(status: Literal["open", "in_progress", "resolved"] = "open", u=Depends(admin)):
    t = now(); keys = ("id", "title", "category", "severity", "urgency", "department", "status", "address", "created_at", "seen", "assigned_to")
    sts, span = QUEUE[status]; since = t - span if span else 0
    out = [{**{k: r[k] for k in keys}, "priority": round(pressure(r, t) * URG.get(r["urgency"] or "routine", 1), 1)}
           for r in db.execute(ALL) if r["status"] in sts and r["created_at"] >= since]
    return sorted(out, key=lambda x: (-x["priority"], -URG.get(x["urgency"] or "routine", 1)))[:100]

@router.get("/admin/export.csv")
def export(u=Depends(admin)):
    cur = db.execute("select id,created_at,category,department,severity,urgency,status,road,area,address,lat,lng,title,description from issues")
    buf = io.StringIO(); w = csv.writer(buf); w.writerow([c[0] for c in cur.description]); w.writerows(cur)
    return Response(buf.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=veranda_issues.csv"})
