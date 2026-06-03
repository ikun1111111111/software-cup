"""BGE-Reranker-v2-m3 reranking wrapper with lazy loading."""
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_reranker: "Reranker | None" = None


class Reranker:
    """Lazy-loaded BGE-Reranker for cross-encoder relevance scoring."""

    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or settings.reranker_model
        self._model = None

    def _load_model(self):
        """Lazy load the reranker model."""
        if self._model is None:
            logger.info("Loading reranker model: %s", self.model_name)
            try:
                from FlagEmbedding import FlagReranker

                self._model = FlagReranker(self.model_name, use_fp16=True)
                logger.info("Reranker model loaded successfully")
            except Exception as e:
                logger.error("Failed to load reranker model: %s", e)
                raise
        return self._model

    def rerank(
        self,
        query: str,
        candidates: list[dict],
        top_k: int | None = None,
    ) -> list[dict]:
        """Rerank candidate chunks and return top-k.

        Args:
            query: The original user query.
            candidates: List of chunk dicts, each must have 'text' key.
            top_k: Number of results to return. Defaults to settings.rerank_top_k.

        Returns:
            Candidates sorted by rerank_score descending, truncated to top_k.
        """
        if top_k is None:
            top_k = settings.rerank_top_k

        if not candidates:
            return []

        if len(candidates) <= top_k:
            # No need to rerank if already fewer than top_k
            for c in candidates:
                c["rerank_score"] = c.get("score", 0.0)
            return candidates

        model = self._load_model()
        texts = [c.get("text", "") for c in candidates]
        pairs = [[query, t] for t in texts]

        try:
            scores = model.compute_score(pairs)
        except Exception as e:
            logger.error("Reranker scoring failed: %s", e)
            # Fallback: keep original order
            for c in candidates:
                c["rerank_score"] = c.get("score", 0.0)
            return candidates[:top_k]

        # Attach scores
        for i, c in enumerate(candidates):
            c["rerank_score"] = float(scores[i]) if i < len(scores) else 0.0

        # Sort by rerank_score descending
        sorted_candidates = sorted(
            candidates,
            key=lambda x: x.get("rerank_score", 0.0),
            reverse=True,
        )
        return sorted_candidates[:top_k]


def get_reranker() -> Reranker:
    """Get the global reranker singleton."""
    global _reranker
    if _reranker is None:
        _reranker = Reranker()
    return _reranker


def reset_reranker() -> None:
    """Reset global reranker (mainly for testing)."""
    global _reranker
    _reranker = None
