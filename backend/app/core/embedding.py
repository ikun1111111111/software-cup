"""BGE-M3 embedding engine with lazy loading and batch encoding."""
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_engine: "EmbeddingEngine | None" = None
_loading = False
_load_error: Exception | None = None
_executor = ThreadPoolExecutor(max_workers=1)


class EmbeddingEngine:
    """Lazy-loaded BGE-M3 embedding engine."""

    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or settings.embedding_model
        self._model = None
        self._dim = 1024  # BGE-M3 dense vector dimension

    def _load_model(self):
        """Lazy load the embedding model (blocking, run in thread)."""
        if self._model is None:
            logger.info("Loading embedding model: %s", self.model_name)
            try:
                from FlagEmbedding import BGEM3FlagModel

                self._model = BGEM3FlagModel(self.model_name, use_fp16=True)
                logger.info("Embedding model loaded successfully")
            except Exception as e:
                logger.error("Failed to load embedding model: %s", e)
                # Return a mock model that returns zero vectors instead of crashing
                self._model = _MockEmbeddingModel(self._dim)
                logger.warning("Using mock embedding model (RAG vector search disabled)")
        return self._model

    def encode(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        """Encode a batch of texts into dense vectors (blocking, run in thread)."""
        if not texts:
            return []

        valid_texts = [t for t in texts if t and t.strip()]
        if not valid_texts:
            return []

        model = self._load_model()

        try:
            result = model.encode(
                valid_texts,
                batch_size=batch_size,
                max_length=512,
            )
            embeddings = result["dense_vecs"]
            return embeddings.tolist()
        except Exception as e:
            logger.error("Embedding encoding failed: %s", e)
            raise

    def encode_query(self, text: str) -> list[float]:
        """Encode a single query text (blocking, run in thread)."""
        if not text or not text.strip():
            return [0.0] * self._dim

        embeddings = self.encode([text])
        return embeddings[0]


class _MockEmbeddingModel:
    """Fallback mock model that returns zero vectors when the real model fails to load."""

    def __init__(self, dim: int):
        self._dim = dim

    def encode(self, texts, **kwargs):
        import numpy as np
        return {"dense_vecs": np.zeros((len(texts), self._dim), dtype=np.float32)}

    @property
    def dim(self) -> int:
        return self._dim


async def _load_model_async() -> None:
    """Preload model in background thread so requests don't block."""
    global _loading, _load_error
    if _loading or _engine is not None:
        return
    _loading = True
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(_executor, get_embedding_engine()._load_model)
        logger.info("Embedding model preloaded in background")
    except Exception as e:
        _load_error = e
        logger.error("Background model preload failed: %s", e)
    finally:
        _loading = False


def get_embedding_engine() -> EmbeddingEngine:
    """Get the global embedding engine singleton."""
    global _engine
    if _engine is None:
        _engine = EmbeddingEngine()
    return _engine


def is_model_ready() -> bool:
    """Check if the embedding model has been loaded."""
    engine = _engine
    return engine is not None and engine._model is not None


def reset_embedding_engine() -> None:
    """Reset the global embedding engine (mainly for testing)."""
    global _engine, _loading, _load_error
    _engine = None
    _loading = False
    _load_error = None
