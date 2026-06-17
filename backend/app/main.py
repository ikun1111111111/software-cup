"""FastAPI entry point for Smart Tourism Digital Human Guide System."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.routing import WebSocketRoute
from app.core.config import get_settings
from app.core.database import init_db
# Import all models so they register with Base.metadata before init_db()
import app.models  # noqa: F401
# from app.core.rag import init_collection  # replaced by vector_store

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # 1. Database tables (skip if PG not available in dev)
    try:
        await init_db()
    except Exception:
        pass  # PostgreSQL may not be ready during dev

    # 2. Milvus collection
    try:
        from app.core.vector_store import get_vector_store
        store = get_vector_store()
        store.ensure_collection()
    except Exception:
        pass  # Milvus may not be ready during dev

    # 3. Rebuild BM25 index from PostgreSQL
    try:
        from app.core.bm25_search import rebuild_bm25_index_from_db
        await rebuild_bm25_index_from_db()
    except Exception:
        pass  # PG may not be ready during dev

    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — 显式列出所有允许的源（移动端局域网部署）
import socket
try:
    _hostname = socket.gethostname()
    _local_ip = socket.gethostbyname(_hostname)
except Exception:
    _local_ip = "localhost"

_cors_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5177",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:8081",
    "http://localhost:8082",
    "http://localhost:8083",
    "http://localhost:8084",
    "http://localhost:8085",
    "http://localhost:8086",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8083",
    "http://127.0.0.1:8086",
    f"http://{_local_ip}:8083",
    f"http://{_local_ip}:8084",
    f"http://{_local_ip}:8085",
    f"http://{_local_ip}:8086",
    f"http://{_local_ip}:8000",
    f"http://{_local_ip}:8001",
    "http://26.115.133.11:8083",
    "http://26.115.133.11:8084",
    "http://26.115.133.11:8085",
    "http://26.115.133.11:8086",
    "http://26.115.133.11:8000",
    "http://26.115.133.11:8001",
    "http://10.0.197.69:8083",
    "http://10.0.197.69:8084",
    "http://10.0.197.69:8085",
    "http://10.0.197.69:8086",
    "http://10.0.197.69:8001",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
from app.api import chat, ws, knowledge, upload, recommend, analytics, avatar, tts, offline, vision, story, room, push, spots, routes_api, vision_room, chat_role, history, zen, puzzle, memory, guide  # noqa: E402

app.include_router(chat.router)
app.include_router(ws.router)
app.include_router(knowledge.router)
app.include_router(upload.router)
app.include_router(recommend.router)
app.include_router(analytics.router)
app.include_router(avatar.router)
app.include_router(tts.router)
app.include_router(offline.router)
app.include_router(vision.router)
app.include_router(story.router)
app.include_router(room.router)
app.include_router(push.router)
app.include_router(spots.router)
app.include_router(routes_api.router)
app.include_router(vision_room.router)
app.include_router(chat_role.router)
app.include_router(history.router)
app.include_router(zen.router)
app.include_router(puzzle.router)
app.include_router(memory.router)
app.include_router(guide.router)

# Register room WebSocket via Starlette native WebSocketRoute
# to avoid FastAPI APIWebSocketRoute + Starlette 1.2.1 incompatibility
from app.api.room import room_websocket  # noqa: E402
app.router.routes.append(WebSocketRoute("/api/room/ws/{room_id}", room_websocket))


@app.get("/health")
async def health_check():
    """Health check endpoint for Docker / monitoring."""
    return {"status": "ok", "app": settings.app_name}


@app.get("/api/health")
async def api_health():
    """API health check with version info."""
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": "1.0.0",
    }
