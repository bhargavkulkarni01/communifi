import os, re, time
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from google.auth.transport import requests as greq
from google.oauth2 import id_token
from pydantic import BaseModel
from common import me, is_admin_user
from config import SECRET, GIDS
from db import db

router = APIRouter()

class Tok(BaseModel): id_token: str
class ZipIn(BaseModel):
    zip: str

@router.get("/", include_in_schema=False)
def root(): return RedirectResponse("/app/")

@router.get("/config")
def config(): return {"maps_key": os.environ.get("GOOGLE_MAPS_KEY", ""), "google_client_id": GIDS[0]}

@router.post("/auth/google")
def login(b: Tok):
    try: i = id_token.verify_oauth2_token(b.id_token, greq.Request())
    except ValueError: raise HTTPException(401, "Google token rejected")
    if i["aud"] not in GIDS: raise HTTPException(401, "Wrong client id")
    db.execute("insert into users(id, email, name) values(?,?,?) on conflict(id) do update set email=excluded.email, name=excluded.name", (i["sub"], i["email"], i.get("name")))
    db.commit()
    return {"token": jwt.encode({"sub": i["sub"], "exp": time.time() + 7 * 86400}, SECRET)}

@router.get("/me")
def whoami(u=Depends(me)):
    r = db.execute("select email, name, zip from users where id=?", (u,)).fetchone()
    return {"name": r["name"], "email": r["email"], "is_admin": is_admin_user(u), "zip": r["zip"]}

@router.post("/me/zip")
def set_zip(b: ZipIn, u=Depends(me)):
    z = b.zip.strip()
    if z and not re.fullmatch(r"\d{5}", z): raise HTTPException(422, "Enter a 5-digit ZIP code")
    db.execute("update users set zip=? where id=?", (z or None, u)); db.commit()
    return {"zip": z or None}
