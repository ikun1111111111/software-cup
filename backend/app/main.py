"""FastAPI entry point for Smart Tourism Digital Human Guide System."""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import get_settings
from app.core.database import init_db
from app.core.rag import init_collection

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # Startup
    await init_db()
    try:
        init_collection()
    except Exception:
        pass  # Milvus may not be ready during dev
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
