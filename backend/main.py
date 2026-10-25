import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from config import CLIENT
from routes import auth, issues, ai, insights, notifications, admin, forecast

app = FastAPI(title="Communifi API")
for m in (auth, issues, ai, insights, notifications, admin, forecast): app.include_router(m.router)
app.mount("/app", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "..", "web", "dist"), html=True))

# web vs mobile client: the app's WebView sends X-Client: app, which hides admin features
@app.middleware("http")
async def tag_client(request, call_next):
    CLIENT.set(request.headers.get("x-client", "web"))
    return await call_next(request)
