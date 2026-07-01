from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,       # Auto-detect stale connections
    pool_recycle=3600,        # Recycle connections after 1 hour
    pool_timeout=30,          # Timeout for getting connection from pool
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """SQLAlchemy 模型基类"""
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _ensure_postgres_schema_compat(conn)


async def _ensure_postgres_schema_compat(conn):
    if conn.dialect.name != "postgresql":
        return

    await conn.execute(text("""
        ALTER TABLE travel_memories
        ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS voice_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS voice_duration INTEGER,
        ADD COLUMN IF NOT EXISTS is_capsule BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS capsule_unlock_at TIMESTAMP WITHOUT TIME ZONE,
        ADD COLUMN IF NOT EXISTS capsule_content TEXT
    """))

    await conn.execute(text("""
        ALTER TABLE tourist_profiles
        ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id),
        ADD COLUMN IF NOT EXISTS dna_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS dna_scores JSON
    """))

    await conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_tourist_profiles_user_id ON tourist_profiles(user_id)"
    ))
    await conn.execute(text(
        "CREATE INDEX IF NOT EXISTS ix_tourist_profiles_dna_type ON tourist_profiles(dna_type)"
    ))


async def check_database_health() -> dict:
    """Check database connectivity and return health status."""
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "message": str(e)[:80]}
