"""Scenic area data import service.
Parses documents from docs/ directory and inserts into knowledge tables."""

import os
import logging
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.knowledge import KnowledgeDoc, KnowledgeChunk, FaqEntry, DocStatus
from app.services.knowledge_service import parse_document, chunk_text
from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Path to docs directory relative to project root
DOCS_DIR = Path(__file__).parent.parent.parent.parent / "docs"


async def import_scenic_documents(db: AsyncSession) -> list[int]:
    """Parse all documents in docs/ and insert into knowledge_docs + chunks.

    Returns list of created document IDs.
    """
    if not DOCS_DIR.exists():
        logger.warning("Docs directory not found: %s", DOCS_DIR)
        return []

    supported_extensions = {".pdf", ".docx", ".doc", ".md", ".txt"}
    doc_ids = []

    for file_path in DOCS_DIR.iterdir():
        if file_path.suffix.lower() not in supported_extensions:
            continue
        if file_path.name.startswith("~"):  # skip temp files
            continue

        logger.info("Processing: %s", file_path.name)

        file_type = file_path.suffix.lower().lstrip(".")
        try:
            text = parse_document(str(file_path), file_type)
        except Exception as e:
            logger.error("Failed to parse %s: %s", file_path.name, e)
            continue

        # Create knowledge_doc
        doc = KnowledgeDoc(
            title=file_path.stem,
            content=text,
            file_type=file_type,
            file_path=str(file_path),
            status=DocStatus.indexed,
            chunk_count=0,
        )
        db.add(doc)
        await db.flush()  # Get doc.id

        # Chunk and create knowledge_chunks
        chunks_text = chunk_text(text)
        for i, chunk_text_str in enumerate(chunks_text):
            chunk = KnowledgeChunk(
                doc_id=doc.id,
                chunk_index=i,
                chunk_text=chunk_text_str,
                token_count=len(chunk_text_str),
            )
            db.add(chunk)

        doc.chunk_count = len(chunks_text)
        doc_ids.append(doc.id)
        logger.info("Imported doc %d: %s (%d chunks)", doc.id, file_path.name, len(chunks_text))

    await db.commit()
    logger.info("Import complete. %d documents imported.", len(doc_ids))
    return doc_ids


async def import_default_faq(db: AsyncSession) -> list[int]:
    """Insert default FAQ entries for the scenic area.

    Returns list of created FAQ IDs.
    """
    default_faqs = [
        {
            "question": "灵山胜境在哪里？",
            "answer": "灵山胜境位于江苏省无锡市滨湖区马山镇，太湖之滨，是国家AAAAA级旅游景区。",
            "keywords": "位置,地址,哪里,在哪,无锡,滨湖,马山,太湖",
            "category": "general",
        },
        {
            "question": "灵山胜境开放时间是什么？",
            "answer": "灵山胜境全年开放，夏季（4月-10月）7:00-17:30，冬季（11月-3月）7:00-17:00。如遇特殊情况可能会有调整，请关注官方公告。",
            "keywords": "开放时间,营业时间,几点,开门,关门,时间",
            "category": "general",
        },
        {
            "question": "灵山胜境门票多少钱？",
            "answer": "灵山胜境成人票210元/人，优待票105元/人（适用于60-69周岁老年人、全日制学生等），70周岁以上老人及1.4米以下儿童免票。具体价格以实际公示为准。",
            "keywords": "门票,票价,价格,多少钱,费用,成人票,优惠,免票",
            "category": "ticket",
        },
        {
            "question": "灵山胜境有哪些主要景点？",
            "answer": "灵山胜境主要景点包括：灵山大佛（88米高青铜佛像）、九龙灌浴（动态音乐群雕）、梵宫（佛教艺术殿堂）、五印坛城（藏传佛教风格）、灵山吉祥颂（大型音乐盛典）、天下第一掌、百子戏弥勒等。",
            "keywords": "景点,主要,有哪些,灵山大佛,九龙灌浴,梵宫,五印坛城,天下第一掌,百子戏弥勒",
            "category": "spots",
        },
        {
            "question": "灵山大佛有多高？",
            "answer": "灵山大佛高88米，其中佛体高79米，莲花座高9米，总高88米。灵山大佛是目前中国最高的青铜立佛，重约700吨，由1560块青铜壁板拼接而成。",
            "keywords": "灵山大佛,高度,多高,88米,青铜,佛像",
            "category": "spots",
        },
        {
            "question": "九龙灌浴是什么？",
            "answer": "九龙灌浴是灵山胜境的大型动态音乐群雕，再现了佛陀诞生时的祥瑞景象。表演时，九条金龙同时喷出泉水沐浴太子佛像，配合音乐和莲花开合，场面宏大壮观，是灵山必看的核心表演之一。",
            "keywords": "九龙灌浴,动态,音乐,群雕,表演,九龙,喷水,太子佛",
            "category": "spots",
        },
        {
            "question": "梵宫有什么特色？",
            "answer": "梵宫是灵山胜境的标志性建筑之一，被誉为'东方卢浮宫'。梵宫内部汇聚了木雕、石雕、壁画、琉璃等众多艺术珍品，更以大型情景演出《灵山吉祥颂》闻名，是一座集佛教文化、艺术、建筑于一体的宏伟殿堂。",
            "keywords": "梵宫,特色,艺术,建筑,灵山吉祥颂,东方卢浮宫,木雕,壁画",
            "category": "spots",
        },
        {
            "question": "怎么去灵山胜境？",
            "answer": "无锡火车站乘坐88路或89路公交车可直达灵山胜境，车程约1小时。自驾可从沪宁高速无锡北出口下，沿太湖大道往马山方向行驶。景区设有大型停车场。",
            "keywords": "交通,怎么去,公交,自驾,路线,火车站,88路,89路",
            "category": "general",
        },
        {
            "question": "灵山胜境有什么美食推荐？",
            "answer": "灵山胜境周边有无锡特色美食：太湖三白（白鱼、白虾、银鱼）、无锡排骨、小笼包、油面筋等。景区内设有素食餐厅和特色小吃街，推荐品尝灵山素面和素斋。",
            "keywords": "美食,吃的,餐厅,素食,素面,太湖三白,排骨,小笼包",
            "category": "food",
        },
        {
            "question": "灵山胜境适合带老人/小孩游玩吗？",
            "answer": "灵山胜境非常适合全家出游。景区道路平整，有电瓶车代步，适合老人游览。天下第一掌、百子戏弥勒等景点深受小朋友喜爱。九龙灌浴表演也适合各年龄段观赏。建议游玩时间4-6小时。",
            "keywords": "老人,小孩,亲子,家庭,全家,电瓶车,适合",
            "category": "general",
        },
    ]

    faq_ids = []

    for faq_data in default_faqs:
        # Check if FAQ already exists
        stmt = select(FaqEntry).where(FaqEntry.question == faq_data["question"])
        result = await db.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            logger.info("FAQ already exists: %s", faq_data["question"][:30])
            continue

        faq = FaqEntry(**faq_data)
        db.add(faq)
        await db.flush()
        faq_ids.append(faq.id)

    await db.commit()
    logger.info("%d default FAQ entries imported.", len(faq_ids))
    return faq_ids


async def import_all(db: AsyncSession) -> dict:
    """Run all data imports: documents + FAQ."""
    logger.info("Starting full data import...")
    doc_ids = await import_scenic_documents(db)
    faq_ids = await import_default_faq(db)
    result = {
        "documents_imported": len(doc_ids),
        "document_ids": doc_ids,
        "faqs_imported": len(faq_ids),
        "faq_ids": faq_ids,
    }
    logger.info("Import complete: %s", result)
    return result
