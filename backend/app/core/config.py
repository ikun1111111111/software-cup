from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "Smart Tourism Digital Human"
    debug: bool = True

    # Database
    db_host: str = "localhost"
    db_port: int = 5432
    db_user: str = "tourism"
    db_password: str = "tourism123"
    db_name: str = "smart_tourism"

    @property
    def database_url(self) -> str:
        return f"postgresql+asyncpg://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    @property
    def database_url_sync(self) -> str:
        return f"postgresql+psycopg2://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"

    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0

    @property
    def redis_url(self) -> str:
        return f"redis://{self.redis_host}:{self.redis_port}/{self.redis_db}"

    # Milvus
    milvus_host: str = "localhost"
    milvus_port: int = 19530
    milvus_collection: str = "scenic_knowledge"

    # MinIO
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "tourism"

    # LLM API Keys (multiple for rotation / fallback)
    deepseek_api_key: str = ""
    deepseek_api_key_1: str = ""
    deepseek_api_key_2: str = ""
    deepseek_api_key_3: str = ""
    deepseek_api_key_4: str = ""
    deepseek_api_key_5: str = ""
    deepseek_api_key_6: str = ""
    deepseek_api_key_7: str = ""
    deepseek_api_key_8: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"

    qwen_api_key: str = ""  # dashscope API key

    doubao_api_key: str = ""
    doubao_base_url: str = "https://ark.cn-beijing.volces.com/api/v3"

    # Model names
    llm_default_model: str = "deepseek-chat"        # DeepSeek-V3
    llm_vision_model: str = "qwen-vl-max"           # Qwen vision
    llm_sentiment_model: str = "doubao-lite-32k"    # 豆包 lite
    llm_summary_model: str = "qwen-long"            # Long context

    # Whisper
    whisper_model: str = "medium"  # tiny/base/small/medium/large
    whisper_device: str = "cpu"    # cpu / cuda

    # CosyVoice
    cosyvoice_endpoint: str = "http://localhost:5001"
    tts_stream_chunk_size: int = 4096  # bytes per SSE chunk

    # Azure Speech Services (TTS)
    azure_speech_key: str = ""
    azure_speech_region: str = "eastasia"  # eastasia, japaneast, etc.
    tts_provider: str = "edge"  # "edge" | "azure"

    # TTS Voice presets: voice_id -> edge-tts voice mapping
    tts_voices: dict = {
        "mandarin": {"speaker_id": "zh-CN-XiaoxiaoNeural", "description": "普通话"},
        "nanjinghua": {"speaker_id": "zh-CN-XiaoxiaoNeural", "description": "南京话"},
        "sichuanhua": {"speaker_id": "zh-CN-XiaoxiaoNeural", "description": "四川话"},
        "male": {"speaker_id": "zh-CN-YunxiNeural", "description": "普通话男声"},
        "female": {"speaker_id": "zh-CN-XiaoyiNeural", "description": "普通话年轻女声"},
    }

    # RAG
    chunk_size: int = 512
    chunk_overlap: int = 64
    embedding_model: str = "BAAI/bge-m3"
    reranker_model: str = "BAAI/bge-reranker-v2-m3"
    retrieval_top_k: int = 10
    rerank_top_k: int = 5

    # Semantic cache
    semantic_cache_model: str = "BAAI/bge-small-zh-v1.5"
    semantic_cache_similarity_threshold: float = 0.90
    semantic_cache_max_entries: int = 1000
    semantic_cache_ttl: int = 3600  # 1 hour

    # Context management
    context_max_rounds: int = 5
    context_ttl: int = 86400  # 24 hours

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
