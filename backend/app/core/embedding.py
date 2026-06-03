"""BGE-M3 embedding engine with lazy loading and batch encoding."""
import logging
from functools import lru_cache

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_engine: "EmbeddingEngine | None" = None


class EmbeddingEngine:
    """Lazy-loaded BGE-M3 embedding engine."""

    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or settings.embedding_model
        self._model = None
        self._dim = 1024  # BGE-M3 dense vector dimension

    def _load_model(self):
        """Lazy load the embedding model."""
        if self._model is None:
            logger.info("Loading embedding model: %s", self.model_name)
            try:
                from FlagEmbedding import BGEM3FlagModel

                self._model = BGEM3FlagModel(self.model_name, use_fp16=True)
                logger.info("Embedding model loaded successfully")
            except Exception as e:
                logger.error("Failed to load embedding model: %s", e)
                raise
        return self._model

    @property
    def dim(self) -> int:
        return self._dim

    def encode(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        """Encode a batch of texts into dense vectors."""
        if not texts:
            return []

        # Filter empty strings first
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
        """Encode a single query text."""
        if not text or not text.strip():
            return [0.0] * self._dim

        embeddings = self.encode([text])
        return embeddings[0]


def get_embedding_engine() -> EmbeddingEngine:
    """Get the global embedding engine singleton."""
    global _engine
    if _engine is None:
        _engine = EmbeddingEngine()
    return _engine


def reset_embedding_engine() -> None:
    """Reset the global embedding engine (mainly for testing)."""
    global _engine
    _engine = None
