"""FastAPI entry point for Smart Tourism Digital Human Guide System."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.database import init_db
# from app.core.rag import init_collection  # replaced by vector_store

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # 1. Database tables
    await init_db()

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

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
from app.api import chat, ws, knowledge, upload, recommend, analytics, avatar, tts, offline, vision, story, room, push, spots, routes_api, vision_room, chat_role, history, zen, puzzle  # noqa: E402

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
