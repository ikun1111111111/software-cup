"""FastAPI entry point for Smart Tourism Digital Human Guide System."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.routing import WebSocketRoute
from app.core.config import get_settings
from app.core.database import init_db
from app.core.rate_limiter import RateLimitMiddleware
from app.core.metrics import MetricsMiddleware, metrics_endpoint
# Import all models so they register with Base.metadata before init_db()
import app.models  # noqa: F401
# from app.core.rag import init_collection  # replaced by vector_store

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    report_scheduler_task = None
    report_scheduler_stop = None
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

    # 4. ASR is large; load it lazily in dev unless explicitly requested.
    if settings.preload_asr_on_startup:
        try:
            from app.core.asr import init_asr_model
            await init_asr_model()
        except Exception:
            pass  # ASR model may not be available

    # 5. Daily DB-backed report archive generation at 18:00 Asia/Shanghai.
    try:
        from app.services.report_scheduler import start_report_scheduler
        report_scheduler_task, report_scheduler_stop = start_report_scheduler()
    except Exception:
        pass

    yield
    try:
        from app.services.report_scheduler import stop_report_scheduler
        await stop_report_scheduler(report_scheduler_task, report_scheduler_stop)
    except Exception:
        pass


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — 显式列出所有允许的源（移动端局域网部署）
import re
import socket
try:
    _hostname = socket.gethostname()
    _local_ip = socket.gethostbyname(_hostname)
except Exception:
    _local_ip = "localhost"

_dev_origin_regex = (
    rf"^http://("
    rf"localhost|127\.0\.0\.1|{re.escape(_local_ip)}|"
    rf"10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|"
    rf"172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|26\.115\.133\.11"
    rf"):\d+$"
)

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
_cors_options = {
    "allow_origins": _cors_origins,
    "allow_origin_regex": _dev_origin_regex,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}

# Global rate limiting (Redis sliding window)
app.add_middleware(RateLimitMiddleware)

# Prometheus-style metrics collection
app.add_middleware(MetricsMiddleware)

# Include API routers
from app.api import chat, ws, knowledge, upload, recommend, analytics, avatar, tts, offline, vision, story, room, push, spots, routes_api, vision_room, chat_role, history, zen, puzzle, memory, guide, tour, auth, asr  # noqa: E402

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
app.include_router(tour.router)
app.include_router(auth.router)
app.include_router(asr.router)

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
    """API health check with dependency status."""
    status = {"status": "ok", "app": settings.app_name, "version": "1.0.0"}
    deps = {}

    # DB check
    try:
        from app.core.database import check_database_health
        deps["database"] = await check_database_health()
        if deps["database"]["status"] != "ok":
            status["status"] = "degraded"
    except Exception as e:
        deps["database"] = {"status": "error", "message": str(e)[:80]}
        status["status"] = "degraded"

    # Redis check
    try:
        from app.core.redis_client import get_redis
        redis = await get_redis()
        await redis.ping()
        deps["redis"] = {"status": "ok"}
    except Exception as e:
        deps["redis"] = {"status": "error", "message": str(e)[:80]}
        status["status"] = "degraded"

    # ASR model check
    try:
        from app.core.asr import _whisper_model
        deps["asr_model"] = {"status": "ok" if _whisper_model else "not_loaded"}
    except Exception:
        deps["asr_model"] = {"status": "unknown"}

    status["dependencies"] = deps
    return status


@app.get("/metrics")
async def prometheus_metrics():
    """Prometheus metrics endpoint."""
    return await metrics_endpoint()


fastapi_app = app
app = CORSMiddleware(fastapi_app, **_cors_options)
