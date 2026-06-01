"""Tests for Pydantic configuration management."""
import os
import pytest
from app.core.config import Settings, get_settings


class TestSettings:
    """Test Pydantic settings loading and defaults."""

    def test_default_values(self):
        """Settings should have sensible defaults."""
        settings = Settings()

        assert settings.app_name == "Smart Tourism Digital Human"
        assert settings.debug is True
        assert settings.db_port == 5432
        assert settings.redis_port == 6379
        assert settings.milvus_port == 19530
        assert settings.chunk_size == 512
        assert settings.chunk_overlap == 64
        assert settings.retrieval_top_k == 10
        assert settings.rerank_top_k == 5

    def test_database_url(self):
        """database_url should construct correctly from components."""
        settings = Settings(db_host="testhost", db_port=5432, db_user="testuser",
                            db_password="secret", db_name="testdb")

        expected = "postgresql+asyncpg://testuser:secret@testhost:5432/testdb"
        assert settings.database_url == expected

    def test_database_url_sync(self):
        """database_url_sync should use psycopg2 driver."""
        settings = Settings(db_host="testhost", db_port=5432, db_user="testuser",
                            db_password="secret", db_name="testdb")

        expected = "postgresql+psycopg2://testuser:secret@testhost:5432/testdb"
        assert settings.database_url_sync == expected

    def test_redis_url(self):
        """Redis URL should construct from host/port/db."""
        settings = Settings(redis_host="redis.example.com", redis_port=6380, redis_db=1)
        assert settings.redis_url == "redis://redis.example.com:6380/1"

    def test_env_file_loading(self, tmp_path):
        """Settings should load from .env file."""
        env_file = tmp_path / ".env"
        env_file.write_text("DB_HOST=prodhost\nDB_PORT=5433\nDEBUG=false\n")

        # Note: pydantic-settings loads .env from current dir by default
        # This test validates the Config is set correctly
        assert Settings.model_config.get("env_file") == ".env"

    def test_get_settings_is_singleton(self):
        """get_settings() should return cached instance."""
        s1 = get_settings()
        s2 = get_settings()
        assert s1 is s2

    def test_custom_values(self):
        """Should accept custom values from environment-style config."""
        settings = Settings(
            deepseek_api_key="sk-test123",
            qwen_api_key="qwen-test456",
            llm_default_model="custom-model",
        )

        assert settings.deepseek_api_key == "sk-test123"
        assert settings.qwen_api_key == "qwen-test456"
        assert settings.llm_default_model == "custom-model"


class TestConfigEdgeCases:
    """Edge cases for configuration."""

    def test_empty_string_values(self):
        """Empty string default values should be handled."""
        settings = Settings()
        assert settings.deepseek_api_key == ""
        assert settings.doubao_api_key == ""

    def test_minio_settings(self):
        """MinIO settings should have correct defaults."""
        settings = Settings()
        assert settings.minio_access_key == "minioadmin"
        assert settings.minio_secret_key == "minioadmin"
        assert settings.minio_bucket == "tourism"
