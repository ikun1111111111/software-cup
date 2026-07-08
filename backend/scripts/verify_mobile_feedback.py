"""Smoke test mobile event feedback into the admin analytics backend.

Usage:
  python scripts/verify_mobile_feedback.py --base-url http://127.0.0.1:8001/api
  python scripts/verify_mobile_feedback.py --base-url http://127.0.0.1:8000/api
"""

from __future__ import annotations

import argparse
import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any


def request_json(method: str, url: str, payload: Any | None = None) -> Any:
    data = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            body = response.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} -> {exc.code}: {body}") from exc


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify mobile analytics feedback path.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8001/api", help="Backend API base URL.")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    stamp = int(time.time())
    session_id = f"mobile-smoke-{stamp}"
    now = datetime.now(timezone.utc).isoformat()

    single_payload = {
        "session_id": session_id,
        "event_name": "tour_started",
        "route_id": "classic-lingshan",
        "route_name": "灵山经典礼佛线",
        "source_page": "route-detail",
        "metadata": {"smoke_test": True, "client": "verify_mobile_feedback"},
    }
    single_result = request_json("POST", f"{base_url}/analytics/mobile-events", single_payload)

    queued_batch = {
        "events": [
            {
                "id": f"{session_id}-spot",
                "name": "spot_arrived",
                "session_id": session_id,
                "timestamp": now,
                "fields": {
                    "spotId": "ling-shan-da-fo",
                    "spotName": "灵山大佛",
                    "sourcePage": "route-map",
                    "durationMs": 180000,
                    "completed": True,
                },
            },
            {
                "id": f"{session_id}-question",
                "name": "question_asked",
                "session_id": session_id,
                "timestamp": now,
                "fields": {
                    "spotId": "jiu-long-guan-yu",
                    "spotName": "九龙灌浴",
                    "sourcePage": "ask-guide",
                    "latencyMs": 860,
                },
            },
        ],
    }
    batch_result = request_json("POST", f"{base_url}/analytics/mobile-events/batch", queued_batch)
    summary = request_json("GET", f"{base_url}/analytics/mobile-tour-summary?days=7")
    recent = request_json("GET", f"{base_url}/analytics/mobile-events/recent?limit=5")

    print(json.dumps({
        "base_url": base_url,
        "session_id": session_id,
        "single_result": single_result,
        "batch_result": batch_result,
        "summary": summary,
        "recent": recent,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
