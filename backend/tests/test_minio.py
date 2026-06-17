"""Tests for MinIO object storage connectivity."""
import pytest
from app.core.config import get_settings


class TestMinioConfig:
    """Test MinIO configuration."""

    def test_minio_settings_exist(self):
        """MinIO settings should be configured."""
        settings = get_settings()
        assert settings.minio_endpoint is not None
        assert settings.minio_access_key is not None
        assert settings.minio_secret_key is not None
        assert settings.minio_bucket is not None
        assert settings.minio_bucket == "tourism"

    def test_minio_endpoint_format(self):
        """MinIO endpoint should be in host:port format."""
        settings = get_settings()
        assert ":" in settings.minio_endpoint

    @pytest.mark.skip(reason="Requires running MinIO")
    async def test_minio_connection(self):
        """Should connect to MinIO server."""
        from minio import Minio
        settings = get_settings()

        host, port = settings.minio_endpoint.split(":")
        client = Minio(
            f"{host}:{port}",
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=False,
        )

        # Bucket should exist or be creatable
        if not client.bucket_exists(settings.minio_bucket):
            client.make_bucket(settings.minio_bucket)

        assert client.bucket_exists(settings.minio_bucket)

    @pytest.mark.skip(reason="Requires running MinIO")
    async def test_file_upload_download(self):
        """Should upload and download a file correctly."""
        import io
        from minio import Minio

        settings = get_settings()
        host, port = settings.minio_endpoint.split(":")
        client = Minio(
            f"{host}:{port}",
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=False,
        )

        # Ensure bucket exists
        if not client.bucket_exists(settings.minio_bucket):
            client.make_bucket(settings.minio_bucket)

        # Upload
        test_data = b"Hello, MinIO! This is test content."
        test_file = io.BytesIO(test_data)
        client.put_object(
            settings.minio_bucket,
            "test/upload.txt",
            test_file,
            len(test_data),
        )

        # Download
        response = client.get_object(settings.minio_bucket, "test/upload.txt")
        downloaded = response.read()
        response.close()
        response.release_conn()

        assert downloaded == test_data

        # Cleanup
        client.remove_object(settings.minio_bucket, "test/upload.txt")
