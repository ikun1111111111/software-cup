"""Redis-based sliding window rate limiting for FastAPI."""
import logging
import time
from typing import Callable

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.core.config import get_settings
from app.core.redis_client import redis_client

logger = logging.getLogger(__name__)
settings = get_settings()

EXEMPT_PATHS = {"/health", "/api/health", "/metrics", "/openapi.json", "/docs", "/redoc"}


def _is_exempt(path: str) -> bool:
    for exempt in EXEMPT_PATHS:
        if path == exempt or path.startswith(exempt + "/"):
            return True
    return False


def _get_client_id(request: Request) -> str:
    """Identify client by user ID if authenticated, otherwise by IP."""
    if hasattr(request.state, "user_id") and request.state.user_id:
        return f"user:{request.state.user_id}"

    forwarded = request.headers.get("x-forwarded-for")
    real_ip = request.headers.get("x-real-ip")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    elif real_ip:
        ip = real_ip.strip()
    else:
        ip = request.client.host if request.client else "unknown"
    return f"ip:{ip}"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Global sliding-window rate limiter.

    Uses Redis sorted sets keyed by client identifier + route prefix.
    Disabled for health, metrics and documentation endpoints.
    """

    def __init__(
        self,
        app,
        requests: int | None = None,
        window: int | None = None,
        enabled: bool | None = None,
        key_prefix: str = "rl:global",
    ):
        super().__init__(app)
        self.requests = requests if requests is not None else settings.rate_limit_requests
        self.window = window if window is not None else settings.rate_limit_window
        self.enabled = enabled if enabled is not None else settings.rate_limit_enabled
        self.key_prefix = key_prefix

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if not self.enabled or _is_exempt(request.url.path):
            return await call_next(request)

        client_id = _get_client_id(request)
        key = f"{self.key_prefix}:{client_id}"

        try:
            allowed = await _check_sliding_window(
                key, self.requests, self.window, redis_client
            )
        except Exception as e:
            # Redis 不可用时放行并记录，避免级联故障
            logger.warning("Rate limiter Redis check failed: %s", e)
            return await call_next(request)

        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="请求过于频繁，请稍后再试",
                headers={"Retry-After": str(self.window)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.requests)
        remaining = max(0, self.requests - await _current_count(key, self.window, redis_client))
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response


async def _check_sliding_window(key: str, limit: int, window: int, redis) -> bool:
    """Add current request to the window and return whether it is allowed."""
    now = time.time()
    window_start = now - window

    pipe = redis.pipeline()
    pipe.zremrangebyscore(key, 0, window_start)
    pipe.zadd(key, {str(now): now})
    pipe.zcard(key)
    pipe.expire(key, window)
    _, _, current_count, _ = await pipe.execute()

    return current_count <= limit


async def _current_count(key: str, window: int, redis) -> int:
    now = time.time()
    try:
        await redis.zremrangebyscore(key, 0, now - window)
        return await redis.zcard(key)
    except Exception:
        return 0


def rate_limit_dependency(
    requests: int | None = None,
    window: int | None = None,
    key_prefix: str = "rl:route",
    identifier: Callable[[Request], str] | None = None,
):
    """FastAPI dependency for route-specific sliding-window rate limiting.

    Example:
        @router.post("/login")
        async def login(..., _=Depends(rate_limit_dependency(requests=5, window=60))):
            ...
    """
    limit = requests if requests is not None else settings.rate_limit_requests
    seconds = window if window is not None else settings.rate_limit_window

    async def _dependency(request: Request):
        if not settings.rate_limit_enabled:
            return
        client_id = identifier(request) if identifier else _get_client_id(request)
        key = f"{key_prefix}:{request.url.path}:{client_id}"
        try:
            allowed = await _check_sliding_window(key, limit, seconds, redis_client)
        except Exception as e:
            logger.warning("Route rate limiter Redis check failed: %s", e)
            return
        if not allowed:
            raise HTTPException(
                status_code=429,
                detail="请求过于频繁，请稍后再试",
                headers={"Retry-After": str(seconds)},
            )

    return _dependency
