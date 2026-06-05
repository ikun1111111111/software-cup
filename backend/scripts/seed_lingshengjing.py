"""Seed Lingshengjing scenic spots, tour routes, and FAQ data into the database."""
import json
import logging
import sys
from pathlib import Path

import asyncio

# Add project root to path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.core.database import async_session, init_db, engine
from app.models.tourist import ScenicSpot, TourRoute
from app.models.knowledge import FaqEntry

logger = logging.getLogger(__name__)

DATA_DIR = ROOT / "data"


async def seed_spots(session, data: dict) -> int:
    """Insert or update scenic spots. Returns count."""
    from sqlalchemy import select
    count = 0
    for item in data["spots"]:
        spot = ScenicSpot(
            id=item["id"],
            name=item["name"],
            category=item["category"],
            tags=item.get("tags", []),
            overview=item.get("overview", ""),
            detail=item.get("detail", ""),
            qr_code=item.get("qr_code"),
            related_spots=item.get("related_spots", []),
        )
        stmt = select(ScenicSpot).where(ScenicSpot.id == spot.id)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            existing.name = spot.name
            existing.category = spot.category
            existing.tags = spot.tags
            existing.overview = spot.overview
            existing.detail = spot.detail
            existing.qr_code = spot.qr_code
            existing.related_spots = spot.related_spots
        else:
            session.add(spot)
        count += 1
    return count


async def seed_routes(session, data: dict) -> int:
    """Insert or update tour routes. Returns count."""
    from sqlalchemy import select
    count = 0
    for item in data["routes"]:
        route = TourRoute(
            id=item["id"],
            name=item["name"],
            route_type=item["type"],
            duration=item["duration"],
            description=item.get("description", ""),
            gradient=item.get("gradient"),
            spot_order=item.get("spot_order", []),
            spot_details=item.get("spot_details"),
        )
        stmt = select(TourRoute).where(TourRoute.id == route.id)
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            existing.name = route.name
            existing.route_type = route.route_type
            existing.duration = route.duration
            existing.description = route.description
            existing.gradient = route.gradient
            existing.spot_order = route.spot_order
            existing.spot_details = route.spot_details
        else:
            session.add(route)
        count += 1
    return count


async def seed_faqs(session, data: dict) -> int:
    """Insert or update FAQ entries. Returns count."""
    from sqlalchemy import select
    count = 0
    for item in data["faqs"]:
        stmt = select(FaqEntry).where(FaqEntry.question == item["question"])
        result = await session.execute(stmt)
        existing = result.scalar_one_or_none()
        if existing:
            existing.answer = item["answer"]
            existing.keywords = item.get("keywords", "")
            existing.category = item.get("category", "general")
            existing.priority = item.get("priority", 0)
        else:
            faq = FaqEntry(
                question=item["question"],
                answer=item["answer"],
                keywords=item.get("keywords", ""),
                category=item.get("category", "general"),
                priority=item.get("priority", 0),
            )
            session.add(faq)
        count += 1
    return count


async def main():
    """Run all seed operations."""
    logging.basicConfig(level=logging.INFO)
    logger.info("Starting Lingshengjing seed...")

    # Ensure tables exist
    await init_db()

    async with async_session() as session:
        async with session.begin():
            # Seed spots
            spots_file = DATA_DIR / "ling_sheng_jing_spots.json"
            if spots_file.exists():
                spots_data = json.loads(spots_file.read_text(encoding="utf-8"))
                spot_count = await seed_spots(session, spots_data)
                logger.info("Seeded %d scenic spots", spot_count)
            else:
                logger.warning("Spots seed file not found: %s", spots_file)

            # Seed routes
            routes_file = DATA_DIR / "ling_sheng_jing_routes.json"
            if routes_file.exists():
                routes_data = json.loads(routes_file.read_text(encoding="utf-8"))
                route_count = await seed_routes(session, routes_data)
                logger.info("Seeded %d tour routes", route_count)
            else:
                logger.warning("Routes seed file not found: %s", routes_file)

            # Seed FAQs
            faq_file = DATA_DIR / "ling_sheng_jing_faq.json"
            if faq_file.exists():
                faq_data = json.loads(faq_file.read_text(encoding="utf-8"))
                faq_count = await seed_faqs(session, faq_data)
                logger.info("Seeded %d FAQ entries", faq_count)
            else:
                logger.warning("FAQ seed file not found: %s", faq_file)

        logger.info("Seed complete!")


if __name__ == "__main__":
    asyncio.run(main())
