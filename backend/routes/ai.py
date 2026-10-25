import os, json, base64
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from common import me
from config import BUCKET, DEPT, KW, URG, WEIGHT, s3

router = APIRouter()

SYSTEM = ("You triage municipal issue reports from a resident's photo and description. Reply with ONLY JSON: "
  '{"title":str,"category":"roads|streetlights|parks|sanitation|other","severity":"low|medium|high","urgency":"routine|soon|urgent|emergency","risks":[up to 3 short strings],"summary":str}. '
  "Judge severity and urgency by risk to public safety.")

class Analyze(BaseModel):
    description: str; photo_key: str | None = None

def fallback(t):
    t = t.lower(); cat = next((c for c, k in KW.items() if any(w in t for w in k)), "other")
    hi = any(w in t for w in ["danger", "wire", "fire", "flood", "blocked", "injur", "gas"])
    return {"title": t[:60].capitalize(), "category": cat, "severity": "high" if hi else "medium", "urgency": "urgent" if hi else "routine", "risks": ["Needs staff review"], "summary": t[:140]}

@router.post("/ai/analyze")
def analyze(b: Analyze, u=Depends(me)):
    out = None; why = "ANTHROPIC_API_KEY not set"
    if os.environ.get("ANTHROPIC_API_KEY"):
        try:
            import anthropic
            content = []
            if b.photo_key:
                img = s3.get_object(Bucket=BUCKET, Key=b.photo_key)["Body"].read()
                content.append({"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": base64.b64encode(img).decode()}})
            content.append({"type": "text", "text": f"Resident description: {b.description}"})
            r = anthropic.Anthropic().messages.create(model=os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5-5"), max_tokens=500, system=SYSTEM, messages=[{"role": "user", "content": content}])
            t = r.content[0].text; out = json.loads(t[t.index("{"):t.rindex("}") + 1]); out["source"] = "ai"
        except Exception as e: print("AI fallback:", repr(e)); why = type(e).__name__
    out = out or fallback(b.description)
    out.setdefault("source", "fallback")
    if out["source"] == "fallback": out["ai_error"] = why
    if out.get("category") not in DEPT: out["category"] = "other"
    if out.get("severity") not in WEIGHT: out["severity"] = "medium"
    if out.get("urgency") not in URG: out["urgency"] = "routine"
    out["risks"] = [str(x) for x in out.get("risks", [])][:3]
    out["department"] = DEPT[out["category"]]
    return out
