"""Prometheus-style metrics collection for the FastAPI backend."""
import time

from fastapi import Request
from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    generate_latest,
    CONTENT_TYPE_LATEST,
    REGISTRY,
)
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

# Histogram buckets tuned for API latency (seconds)
_HTTP_BUCKETS = [
    0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75,
    1.0, 2.5, 5.0, 7.5, 10.0, float("inf"),
]

http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "path", "status"],
    buckets=_HTTP_BUCKETS,
)

http_requests_in_progress = Gauge(
    "http_requests_in_progress",
    "Number of HTTP requests currently being processed",
    ["method"],
)

# Exclude long-running/streaming endpoints from latency histograms to avoid skew
_LONG_RUNNING_PATHS = {"/ws", "/api/room/ws", "/api/chat/stream", "/api/tts/stream"}


def _is_long_running(path: str) -> bool:
    for prefix in _LONG_RUNNING_PATHS:
        if path == prefix or path.startswith(prefix + "/"):
            return True
    return False


def _get_route_path(request: Request) -> str:
    """Try to obtain the route template (e.g. /api/attractions/{id})."""
    route = request.scope.get("route")
    if route and hasattr(route, "path"):
        return route.path
    return request.url.path


class MetricsMiddleware(BaseHTTPMiddleware):
    """Collect request count, duration and in-flight gauges for Prometheus."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        method = request.method

        # Skip metrics endpoint itself to avoid recursive noise
        if request.url.path == "/metrics":
            return await call_next(request)

        start = time.perf_counter()
        http_requests_in_progress.labels(method=method).inc()

        try:
            response = await call_next(request)
            status = str(response.status_code)
        except Exception:
            status = "500"
            raise
        finally:
            http_requests_in_progress.labels(method=method).dec()

        # Route template is available after the request has been routed
        path = _get_route_path(request)
        if not _is_long_running(path):
            duration = time.perf_counter() - start
            http_request_duration_seconds.labels(method=method, path=path, status=status).observe(duration)
        http_requests_total.labels(method=method, path=path, status=status).inc()

        return response


async def metrics_endpoint() -> Response:
    """Expose Prometheus metrics."""
    return Response(content=generate_latest(REGISTRY), media_type=CONTENT_TYPE_LATEST)
