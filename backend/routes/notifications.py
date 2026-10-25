from fastapi import APIRouter, Depends
from common import me
from config import now
from db import db

router = APIRouter()

@router.get("/notifications")
def notifications(u=Depends(me)):
    r = db.execute("""select p.text, p.created_at, i.title, i.id issue_id from updates p join issues i on i.id=p.issue_id
        where i.user_id=? and coalesce(p.internal,0)=0 order by p.created_at desc limit 30""", (u,))
    return [dict(x) for x in r]

@router.get("/notifications/count")
def notif_count(u=Depends(me)):
    seen = db.execute("select coalesce(notif_seen,0) from users where id=?", (u,)).fetchone()[0]
    n = db.execute("select count(*) from updates p join issues i on i.id=p.issue_id where i.user_id=? and p.created_at>? and coalesce(p.internal,0)=0 and p.text not like 'Reported and routed%'", (u, seen)).fetchone()[0]
    return {"count": n}

@router.post("/notifications/read")
def notif_read(u=Depends(me)):
    db.execute("update users set notif_seen=? where id=?", (now(), u)); db.commit()
    return {"ok": True}
