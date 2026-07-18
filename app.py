from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import Request
from pathlib import Path
import os, uuid, datetime
from dotenv import load_dotenv

from core.loop_engine import run_agentic_loop, AGENTS

BASE = Path(__file__).resolve().parent
load_dotenv(BASE / ".env")
UPLOAD_DIR = BASE / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_UPLOADS = {".txt", ".md", ".csv", ".json", ".pdf", ".png", ".jpg", ".jpeg", ".webp"}

app = FastAPI(title="AIOS ONE", version="3.0.0")
app.mount("/static", StaticFiles(directory=str(BASE / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE / "templates"))

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse(request, "index.html", {
        "agents": AGENTS,
        "supabase_url": os.getenv("SUPABASE_URL", ""),
        "supabase_publishable_key": os.getenv("SUPABASE_PUBLISHABLE_KEY", ""),
    })

@app.get("/api/health")
async def health():
    configured = bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_PUBLISHABLE_KEY"))
    return {
        "ok": True,
        "service": "aios-one",
        "version": app.version,
        "database_configured": configured,
        "time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

@app.get("/api/agents")
async def api_agents():
    return {"agents": AGENTS}

@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    original = file.filename or "upload"
    safe_name = Path(original).name.replace("/", "_").replace("\\", "_")
    suffix = Path(safe_name).suffix.lower()
    if suffix not in ALLOWED_UPLOADS:
        raise HTTPException(415, "Unsupported file type")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File exceeds the 10 MB limit")
    target = UPLOAD_DIR / f"{uuid.uuid4().hex[:8]}_{safe_name}"
    target.write_bytes(content)
    return {"ok": True, "filename": safe_name, "stored_as": target.name, "size": target.stat().st_size}

@app.websocket("/ws/run")
async def ws_run(websocket: WebSocket):
    await websocket.accept()
    try:
        payload = await websocket.receive_json()
        task = payload.get("task", "").strip()
        loops = int(payload.get("loops", 3))
        mode = payload.get("mode", "balanced")
        if not task:
            await websocket.send_json({"type": "error", "message": "Please enter a task first."})
            return
        async for event in run_agentic_loop(task=task, loops=loops, mode=mode):
            await websocket.send_json(event)
        await websocket.send_json({"type": "done", "time": datetime.datetime.now().isoformat()})
    except WebSocketDisconnect:
        return
    except Exception as e:
        await websocket.send_json({"type": "error", "message": str(e)})
