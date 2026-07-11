"""Local demo data fallback for scenic spots and routes."""
from functools import lru_cache
import json
from pathlib import Path
from typing import Any


DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def _load_json(filename: str) -> dict[str, Any]:
    with (DATA_DIR / filename).open("r", encoding="utf-8") as file:
        return json.load(file)


def _normalize_spot(spot: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": spot["id"],
        "name": spot["name"],
        "category": spot.get("category", "核心景点"),
        "tags": spot.get("tags"),
        "overview": spot.get("overview", ""),
        "detail": spot.get("detail", ""),
        "qr_code": spot.get("qr_code"),
        "related_spots": spot.get("related_spots"),
        "thumbnail": spot.get("thumbnail"),
        "detail_images": spot.get("detail_images"),
        "story_acts": spot.get("story_acts"),
        "duration": spot.get("duration"),
        "qa_json": spot.get("qa_json"),
        "display_x": spot.get("display_x"),
        "display_y": spot.get("display_y"),
        "latitude": spot.get("latitude"),
        "longitude": spot.get("longitude"),
        "is_active": spot.get("is_active", True),
    }


def _normalize_route(route: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": route["id"],
        "name": route["name"],
        "route_type": route.get("route_type") or route.get("type", "custom"),
        "duration": route.get("duration", ""),
        "description": route.get("description", ""),
        "gradient": route.get("gradient"),
        "cover_image": route.get("cover_image"),
        "color": route.get("color"),
        "brush_image": route.get("brush_image"),
        "opening_text": route.get("opening_text"),
        "closing_text": route.get("closing_text"),
        "spot_order": route.get("spot_order", []),
        "spot_details": route.get("spot_details"),
        "is_active": route.get("is_active", True),
    }


@lru_cache(maxsize=1)
def load_demo_spots() -> tuple[dict[str, Any], ...]:
    payload = _load_json("ling_sheng_jing_spots.json")
    return tuple(_normalize_spot(spot) for spot in payload.get("spots", []))


@lru_cache(maxsize=1)
def load_demo_routes() -> tuple[dict[str, Any], ...]:
    payload = _load_json("ling_sheng_jing_routes.json")
    return tuple(_normalize_route(route) for route in payload.get("routes", []))


def list_demo_spots(category: str | None = None) -> list[dict[str, Any]]:
    spots = [spot for spot in load_demo_spots() if spot.get("is_active", True)]
    if category:
        spots = [spot for spot in spots if spot["category"] == category]
    return sorted(spots, key=lambda spot: spot["name"])


def get_demo_spot(spot_id: str) -> dict[str, Any] | None:
    return next((spot for spot in load_demo_spots() if spot["id"] == spot_id), None)


def list_demo_routes(route_type: str | None = None) -> list[dict[str, Any]]:
    routes = [route for route in load_demo_routes() if route.get("is_active", True)]
    if route_type:
        routes = [route for route in routes if route["route_type"] == route_type]
    return routes


def get_demo_route(route_id: str) -> dict[str, Any] | None:
    return next((route for route in load_demo_routes() if route["id"] == route_id), None)
