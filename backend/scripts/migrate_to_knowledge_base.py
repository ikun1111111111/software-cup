"""Merge story_frameworks.json and routeData.ts into scenic_spots / tour_routes."""
import argparse
import asyncio
import json
import logging
from pathlib import Path

from sqlalchemy import select

ROOT = Path(__file__).resolve().parents[1]
import sys

sys.path.insert(0, str(ROOT))

from app.core.database import async_session
from app.models.tourist import ScenicSpot, TourRoute

logger = logging.getLogger(__name__)

DATA_DIR = ROOT / "data"
PROJECT_DIR = ROOT.parent


def load_json(name: str) -> dict:
    path = DATA_DIR / name if (DATA_DIR / name).exists() else PROJECT_DIR / name
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_route_data() -> dict:
    path = PROJECT_DIR / "tmp_route_data.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_story_acts(spot_id: str, acts: list[dict]) -> list[dict]:
    return [
        {
            "id": act["id"],
            "title": act["title"],
            "emotion": act["emotion"],
            "prompt_hint": act["prompt_hint"],
            "act_image": f"story/{spot_id}/act-{idx + 1}-{act['id']}.jpg",
        }
        for idx, act in enumerate(acts)
    ]


async def dry_run(spot_meta: dict, frameworks: dict, routes: list[dict]):
    print("\n=== 景点映射 ===")
    print(f"{'spot_id':<25} {'name':<15} {'story_acts':<12} {'duration':<10} {'qa_count':<10}")
    for spot_id, meta in spot_meta.items():
        acts = frameworks.get(spot_id, {}).get("acts", [])
        route_spot = next((r for r in routes if any(s["id"] == spot_id for s in r["spots"])), None)
        qa_count = 0
        if route_spot:
            qa_count = len(next((s["qa"] for s in route_spot["spots"] if s["id"] == spot_id), []))
        print(
            f"{spot_id:<25} {meta['name']:<15} {len(acts):<12} {meta.get('duration', '-'):<10} {qa_count:<10}"
        )

    print("\n=== 路线映射 ===")
    print(f"{'route_id':<20} {'name':<15} {'spot_count':<12} {'spots':<}")
    for route in routes:
        print(f"{route['id']:<20} {route['name']:<15} {len(route['spots']):<12} {[s['id'] for s in route['spots']]}")


async def apply_migration(spot_meta: dict, frameworks: dict, routes: list[dict]):
    async with async_session() as db:
        # Update scenic spots
        for spot_id, meta in spot_meta.items():
            stmt = select(ScenicSpot).where(ScenicSpot.id == spot_id)
            result = await db.execute(stmt)
            spot = result.scalar_one_or_none()
            if not spot:
                logger.warning("ScenicSpot not found: %s", spot_id)
                continue

            spot.duration = meta.get("duration")
            spot.thumbnail = meta.get("icon", "").lstrip("/") or None
            spot.display_x = meta.get("x")
            spot.display_y = meta.get("y")
            # Use routeData description as overview for guide narration
            spot.overview = meta.get("description", spot.overview)

            # QA from route data
            qa = []
            for route in routes:
                for s in route["spots"]:
                    if s["id"] == spot_id:
                        qa = s.get("qa", [])
                        break
                if qa:
                    break
            spot.qa_json = qa or None

            # Story acts from frameworks
            acts = frameworks.get(spot_id, {}).get("acts", [])
            if acts:
                spot.story_acts = build_story_acts(spot_id, acts)

            logger.info("Updated scenic spot: %s", spot_id)

        # Update tour routes
        for route in routes:
            stmt = select(TourRoute).where(TourRoute.id == route["id"])
            result = await db.execute(stmt)
            db_route = result.scalar_one_or_none()
            if db_route:
                db_route.name = route.get("name", db_route.name)
                db_route.duration = route.get("duration", db_route.duration)
                db_route.color = route.get("color")
                db_route.brush_image = route.get("brushImage", "").lstrip("/") or None
                db_route.opening_text = route.get("openingText")
                db_route.closing_text = route.get("closingText")
                logger.info("Updated tour route: %s", route["id"])
            else:
                db_route = TourRoute(
                    id=route["id"],
                    name=route["name"],
                    route_type="custom",
                    duration=route.get("duration", ""),
                    description="",
                    color=route.get("color"),
                    brush_image=route.get("brushImage", "").lstrip("/") or None,
                    opening_text=route.get("openingText"),
                    closing_text=route.get("closingText"),
                    spot_order=[s["id"] for s in route.get("spots", [])],
                    spot_details={},
                )
                db.add(db_route)
                logger.info("Inserted tour route: %s", route["id"])

        await db.commit()


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply migration")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    route_data_raw = load_route_data()
    spot_meta = {s["id"]: s for s in route_data_raw["spots"]}
    route_data = route_data_raw["routes"]
    frameworks = load_json("story_frameworks.json")

    await dry_run(spot_meta, frameworks, route_data)

    if args.apply:
        print("\nApplying migration...")
        await apply_migration(spot_meta, frameworks, route_data)
        print("Migration applied.")
    else:
        print("\nDry run complete. Use --apply to write to database.")


if __name__ == "__main__":
    asyncio.run(main())
