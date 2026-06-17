"""Locust pressure test for backend API latency validation.

Goal: 50 concurrent users, average response < 5 seconds per chat request.

Usage:
    # Start backend first:
    cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000

    # Run Locust (web UI):
    cd backend && locust -f tests/test_pressure.py
    # Then open http://localhost:8089

    # Or run headless:
    cd backend && locust -f tests/test_pressure.py \
        --headless -u 50 -r 10 --run-time 5m \
        --host http://localhost:8000 \
        --html reports/pressure_report.html

Metrics tracked:
    - Response time (avg / p95 / p99)
    - Failure rate
    - RPS (requests per second)
"""
import random
import time

import pytest

locust = pytest.importorskip("locust")
from locust import HttpUser, task, between, events

# Test questions pool (randomized to avoid cache bias)
QUESTION_POOL = [
    "灵山大佛有多高？",
    "梵宫是什么时候建成的？",
    "九龙灌浴表演时间是什么？",
    "五印坛城是什么建筑风格？",
    "灵山胜境门票多少钱？",
    "从无锡市区怎么去灵山？",
    "游览灵山需要多长时间？",
    "灵山有哪些主要景点？",
    "梵宫地涌宝塔是什么？",
    "摸佛脚有什么寓意？",
]


class ChatUser(HttpUser):
    """Simulates a tourist interacting with the digital human."""

    wait_time = between(1, 5)  # Think time between 1-5 seconds

    def on_start(self):
        """Initialize user session."""
        self.session_id = f"locust-{self.user_id}-{int(time.time() * 1000)}"

    @task(10)
    def chat_stream(self):
        """Primary task: SSE streaming chat."""
        question = random.choice(QUESTION_POOL)
        payload = {
            "session_id": self.session_id,
            "question": question,
            "stream": True,
        }

        with self.client.post(
            "/api/chat/stream",
            json=payload,
            stream=True,
            catch_response=True,
            timeout=30,
        ) as response:
            if response.status_code != 200:
                response.failure(f"HTTP {response.status_code}")
                return

            # Read SSE stream to completion to measure true end-to-end latency
            content = b""
            try:
                for chunk in response.iter_content(chunk_size=1024):
                    content += chunk
                    if b"event: done" in content:
                        break
            except Exception as e:
                response.failure(f"Stream read error: {e}")
                return

            if b"event: done" not in content:
                response.failure("Missing 'done' event in SSE stream")
                return

            response.success()

    @task(2)
    def chat_non_stream(self):
        """Non-streaming chat fallback."""
        question = random.choice(QUESTION_POOL)
        payload = {
            "session_id": self.session_id,
            "question": question,
            "stream": False,
        }
        self.client.post("/api/chat/stream", json=payload, timeout=30)

    @task(3)
    def get_recommendations(self):
        """Recommendation API."""
        self.client.get(
            f"/api/recommend?session_id={self.session_id}&limit=3",
            timeout=10,
        )

    @task(1)
    def get_analytics(self):
        """Analytics overview (admin simulation)."""
        self.client.get("/api/analytics/overview", timeout=10)

    @task(1)
    def health_check(self):
        """Health endpoint."""
        self.client.get("/health", timeout=5)


class VoiceUser(HttpUser):
    """Simulates voice interaction users (smaller subset)."""

    wait_time = between(3, 8)
    weight = 1  # 1 voice user per 10 chat users

    def on_start(self):
        self.session_id = f"voice-{self.user_id}-{int(time.time() * 1000)}"

    @task(1)
    def websocket_voice_chat(self):
        """WebSocket voice pipeline (text-based simulation)."""
        # Locust does not natively support WebSocket load testing without extra plugins.
        # We simulate by calling the health endpoint as a lightweight proxy,
        # or you can install locust-plugins for true WebSocket testing.
        self.client.get("/health", timeout=5)


# ── Event hooks for custom metrics ───────────────────────────────────────────


@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, context, exception, **kwargs):
    """Log slow requests for post-analysis."""
    if response_time > 5000:
        print(f"[SLOW] {request_type} {name}: {response_time:.0f}ms > 5s threshold")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Print summary at test end."""
    stats = environment.runner.stats
    total = stats.total
    if not total:
        return

    avg_ms = total.avg_response_time
    p95_ms = total.get_response_time_percentile(0.95)
    p99_ms = total.get_response_time_percentile(0.99)
    fail_rate = total.fail_ratio

    print("\n" + "=" * 60)
    print("  压测结果摘要")
    print("=" * 60)
    print(f"  总请求数:   {total.num_requests}")
    print(f"  失败数:     {total.num_failures}")
    print(f"  失败率:     {fail_rate:.2%}")
    print(f"  平均延迟:   {avg_ms:.0f} ms")
    print(f"  P95 延迟:   {p95_ms:.0f} ms")
    print(f"  P99 延迟:   {p99_ms:.0f} ms")
    print(f"  RPS:        {total.total_rps:.1f}")
    print("=" * 60)

    if avg_ms > 5000:
        print("\n⚠️  平均延迟超过 5s 目标，需要优化！")
    elif p95_ms > 5000:
        print("\n⚠️  P95 延迟超过 5s 目标，需要优化！")
    else:
        print("\n✅ 延迟指标达标！")
