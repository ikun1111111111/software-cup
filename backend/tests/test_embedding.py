"""Tests for embedding engine."""
import pytest
from unittest.mock import patch, MagicMock
import numpy as np

from app.core.embedding import EmbeddingEngine, get_embedding_engine, reset_embedding_engine


class TestEmbeddingEngine:
    """Test BGE-M3 embedding wrapper."""

    def test_init(self):
        """Should initialize with correct defaults."""
        engine = EmbeddingEngine()
        assert engine.model_name == "BAAI/bge-m3"
        assert engine.dim == 1024
        assert engine._model is None

    def test_custom_model_name(self):
        """Should accept custom model name."""
        engine = EmbeddingEngine("custom-model")
        assert engine.model_name == "custom-model"

    def test_encode_query_empty(self):
        """Empty query should return zero vector."""
        engine = EmbeddingEngine()
        result = engine.encode_query("")
        assert result == [0.0] * 1024

    def test_encode_empty_list(self):
        """Empty list should return empty list."""
        engine = EmbeddingEngine()
        result = engine.encode([])
        assert result == []

    def test_encode_all_empty_texts(self):
        """All empty texts should return empty list."""
        engine = EmbeddingEngine()
        result = engine.encode(["", "   ", ""])
        assert result == []

    def test_encode_success(self):
        """Should encode texts into dense vectors."""
        mock_model = MagicMock()
        mock_model.encode.return_value = {
            "dense_vecs": np.array([[0.1] * 1024, [0.2] * 1024])
        }

        with patch.object(EmbeddingEngine, "_load_model", return_value=mock_model):
            engine = EmbeddingEngine()
            result = engine.encode(["灵山胜境", "灵山大佛"])

            assert len(result) == 2
            assert len(result[0]) == 1024
            assert result[0][0] == 0.1
            mock_model.encode.assert_called_once()

    def test_encode_query(self):
        """Should encode single query."""
        mock_model = MagicMock()
        mock_model.encode.return_value = {
            "dense_vecs": np.array([[0.5] * 1024])
        }

        with patch.object(EmbeddingEngine, "_load_model", return_value=mock_model):
            engine = EmbeddingEngine()
            result = engine.encode_query("test query")

            assert len(result) == 1024
            assert result[0] == 0.5


class TestEmbeddingSingleton:
    """Test global embedding engine singleton."""

    def test_singleton(self):
        """Should return same instance."""
        reset_embedding_engine()
        e1 = get_embedding_engine()
        e2 = get_embedding_engine()
        assert e1 is e2

    def test_reset(self):
        """Reset should create new instance on next get."""
        reset_embedding_engine()
        e1 = get_embedding_engine()
        reset_embedding_engine()
        e2 = get_embedding_engine()
        assert e1 is not e2
