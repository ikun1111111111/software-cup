"""Tests for Redis rate-limit circuit breaker behavior."""

import asyncio
import logging
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from starlette.requests import Request
from starlette.responses import Response

from app.core import rate_limiter


@pytest.fixture(autouse=True)
def reset_redis_rate_limit_circuit():
    rate_limiter._reset_redis_rate_limit_circuit()
    yield
    rate_limiter._reset_redis_rate_limit_circuit()


def _install_clock(monkeypatch, value: float):
    clock = SimpleNamespace(value=value)
    monkeypatch.setattr(
        rate_limiter, "time", SimpleNamespace(monotonic=lambda: clock.value)
    )
    return clock


@pytest.mark.asyncio
async def test_timeout_opens_circuit_and_logs_warning(monkeypatch, caplog):
    check = AsyncMock(side_effect=TimeoutError("Redis timed out"))
    _install_clock(monkeypatch, 100.0)

    with caplog.at_level(logging.WARNING, logger=rate_limiter.__name__):
        result = await rate_limiter._check_rate_limit_resilient(check)

    assert result is None
    check.assert_awaited_once_with()
    assert len(caplog.records) == 1


@pytest.mark.asyncio
async def test_open_circuit_skips_redis_check(monkeypatch):
    check = AsyncMock(side_effect=TimeoutError("Redis timed out"))
    clock = _install_clock(monkeypatch, 100.0)

    first_result = await rate_limiter._check_rate_limit_resilient(check)
    clock.value = 101.0
    second_result = await rate_limiter._check_rate_limit_resilient(check)

    assert first_result is None
    assert second_result is None
    assert check.await_count == 1


@pytest.mark.asyncio
async def test_circuit_retries_after_cooldown(monkeypatch):
    check = AsyncMock(side_effect=(TimeoutError("Redis timed out"), True))
    clock = _install_clock(monkeypatch, 100.0)

    first_result = await rate_limiter._check_rate_limit_resilient(check)
    clock.value = 130.0
    recovered_result = await rate_limiter._check_rate_limit_resilient(check)

    assert first_result is None
    assert recovered_result is True
    assert check.await_count == 2


@pytest.mark.asyncio
async def test_cooldown_starts_when_slow_failure_occurs(monkeypatch):
    clock = _install_clock(monkeypatch, 100.0)

    async def slow_failure():
        clock.value = 131.0
        raise TimeoutError("Redis timed out")

    skipped_check = AsyncMock(return_value=True)

    first_result = await rate_limiter._check_rate_limit_resilient(slow_failure)
    assert rate_limiter._redis_rate_limit_retry_after == 161.0
    clock.value = 132.0
    second_result = await rate_limiter._check_rate_limit_resilient(skipped_check)

    assert first_result is None
    assert second_result is None
    skipped_check.assert_not_awaited()


@pytest.mark.asyncio
async def test_late_success_does_not_clear_newer_failure(monkeypatch):
    clock = _install_clock(monkeypatch, 100.0)
    success_started = asyncio.Event()
    release_success = asyncio.Event()

    async def delayed_success():
        success_started.set()
        await release_success.wait()
        return True

    async def failure():
        raise TimeoutError("Redis timed out")

    success_task = asyncio.create_task(
        rate_limiter._check_rate_limit_resilient(delayed_success)
    )
    await success_started.wait()
    failure_result = await rate_limiter._check_rate_limit_resilient(failure)
    release_success.set()
    success_result = await success_task

    clock.value = 101.0
    skipped_check = AsyncMock(return_value=True)
    circuit_result = await rate_limiter._check_rate_limit_resilient(skipped_check)

    assert failure_result is None
    assert success_result is True
    assert circuit_result is None
    skipped_check.assert_not_awaited()


@pytest.mark.asyncio
async def test_recovery_probe_is_single_flight(monkeypatch):
    clock = _install_clock(monkeypatch, 100.0)

    async def failure():
        raise TimeoutError("Redis timed out")

    await rate_limiter._check_rate_limit_resilient(failure)
    clock.value = 130.0

    probe_started = asyncio.Event()
    release_probe = asyncio.Event()
    probe_calls = 0

    async def probe():
        nonlocal probe_calls
        probe_calls += 1
        probe_started.set()
        await release_probe.wait()
        return True

    first_probe = asyncio.create_task(
        rate_limiter._check_rate_limit_resilient(probe)
    )
    await probe_started.wait()
    second_probe = asyncio.create_task(
        rate_limiter._check_rate_limit_resilient(probe)
    )
    await asyncio.sleep(0)
    release_probe.set()

    results = await asyncio.gather(first_probe, second_probe)

    assert probe_calls == 1
    assert results.count(True) == 1
    assert results.count(None) == 1


def _request(path: str = "/api/example") -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "scheme": "http",
            "path": path,
            "raw_path": path.encode(),
            "query_string": b"",
            "headers": [],
            "client": ("127.0.0.1", 1234),
            "server": ("testserver", 80),
        }
    )


@pytest.mark.asyncio
async def test_middleware_uses_resilient_check_and_fails_open(monkeypatch):
    resilient_check = AsyncMock(return_value=None)
    sliding_window = AsyncMock(return_value=True)
    call_next = AsyncMock(return_value=Response("ok"))
    monkeypatch.setattr(
        rate_limiter, "_check_rate_limit_resilient", resilient_check, raising=False
    )
    monkeypatch.setattr(rate_limiter, "_check_sliding_window", sliding_window)
    middleware = rate_limiter.RateLimitMiddleware(
        lambda scope, receive, send: None,
        requests=10,
        window=60,
        enabled=True,
    )

    response = await middleware.dispatch(_request(), call_next)

    assert response.status_code == 200
    resilient_check.assert_awaited_once()
    sliding_window.assert_not_awaited()
    call_next.assert_awaited_once()


@pytest.mark.asyncio
async def test_dependency_uses_resilient_check_and_fails_open(monkeypatch):
    resilient_check = AsyncMock(return_value=None)
    sliding_window = AsyncMock(return_value=True)
    monkeypatch.setattr(rate_limiter.settings, "rate_limit_enabled", True)
    monkeypatch.setattr(
        rate_limiter, "_check_rate_limit_resilient", resilient_check, raising=False
    )
    monkeypatch.setattr(rate_limiter, "_check_sliding_window", sliding_window)
    dependency = rate_limiter.rate_limit_dependency(requests=10, window=60)

    result = await dependency(_request())

    assert result is None
    resilient_check.assert_awaited_once()
    sliding_window.assert_not_awaited()
