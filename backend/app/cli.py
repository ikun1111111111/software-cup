"""CLI utilities for managing the application."""
import asyncio
import argparse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cli")


async def run_import():
    """Run data import from docs/ directory."""
    from app.core.database import async_session, init_db
    from app.services.import_service import import_all
    from app.core.rag import init_collection

    await init_db()
    logger.info("Database tables created.")

    try:
        init_collection()
        logger.info("Milvus collection initialized.")
    except Exception as e:
        logger.warning("Milvus init skipped: %s", e)

    async with async_session() as db:
        result = await import_all(db)
        logger.info("Import result: %s", result)


async def run_init_db():
    """Initialize database tables only."""
    from app.core.database import init_db
    await init_db()
    logger.info("Database tables created.")


def main():
    parser = argparse.ArgumentParser(description="Smart Tourism CLI")
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("import", help="Import scenic data from docs/")
    subparsers.add_parser("init-db", help="Initialize database tables")
    subparsers.add_parser("test-accuracy", help="Run accuracy benchmark (to be implemented by 队员1)")

    args = parser.parse_args()

    if args.command == "import":
        asyncio.run(run_import())
    elif args.command == "init-db":
        asyncio.run(run_init_db())
    elif args.command == "test-accuracy":
        logger.info("Accuracy test will be implemented by 队员1 (A-008)")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
