"""Global error handling utilities for FastAPI."""
import logging
from functools import wraps
from fastapi import HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def classify_error(exc: Exception) -> tuple[int, str]:
    """Classify exception into HTTP status code and user-friendly message."""
    msg = str(exc).lower()
    
    if "database" in msg or "sqlalchemy" in msg or "connection" in msg and "db" in msg:
        return 503, "数据库服务暂时不可用"
    
    if "redis" in msg:
        return 503, "缓存服务暂时不可用"
    
    if "llm" in msg or "ai" in msg or "openai" in msg or "deepseek" in msg:
        return 503, "AI服务暂时不可用，请稍后重试"
    
    if "milvus" in msg or "vector" in msg:
        return 503, "向量检索服务暂时不可用"
    
    if "timeout" in msg:
        return 504, "请求超时，请稍后重试"
    
    return 500, "服务器内部错误，请稍后重试"


def with_error_handling(context: str = ""):
    """Decorator for automatic error handling on async endpoints."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except HTTPException:
                raise
            except Exception as e:
                status_code, message = classify_error(e)
                logger.error("[%s] %s: %s", context, type(e).__name__, e, exc_info=True)
                return JSONResponse(
                    status_code=status_code,
                    content={"code": status_code, "message": message, "data": None}
                )
        return wrapper
    return decorator
