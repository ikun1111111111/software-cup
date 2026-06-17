"""Knowledge Graph import service — populates Neo4j with Lingshengjing attractions.

Creates nodes for scenic spots, dynasties, events, figures, and cultural concepts,
with rich relationships between them for graph-based knowledge retrieval.
"""
import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Path to structured scenic spots data
SPOTS_DATA_PATH = Path(__file__).parent.parent.parent / "data" / "ling_sheng_jing_spots.json"

# Neo4j Cypher queries for schema creation
CREATE_CONSTRAINTS = [
    "CREATE CONSTRAINT IF NOT EXISTS FOR (s:Spot) REQUIRE s.id IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (d:Dynasty) REQUIRE d.name IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (e:Event) REQUIRE e.name IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (f:Figure) REQUIRE f.name IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (c:CultureConcept) REQUIRE c.name IS UNIQUE",
    "CREATE CONSTRAINT IF NOT EXISTS FOR (cat:Category) REQUIRE cat.name IS UNIQUE",
]


# ── Lingshengjing knowledge base ──────────────────────────────────────────────

def get_lingshan_knowledge_graph() -> dict:
    """Return the complete Lingshengjing knowledge graph as a dict.

    This data is used to populate Neo4j nodes and relationships.
    """
    # Load spots from JSON if available
    spots = []
    if SPOTS_DATA_PATH.exists():
        try:
            spots_data = json.loads(SPOTS_DATA_PATH.read_text(encoding="utf-8"))
            spots = spots_data.get("spots", [])
        except Exception:
            pass

    return {
        "spots": spots,
        "dynasties": [
            {"name": "唐代", "period": "618-907", "significance": "佛教鼎盛时期，灵山小灵山寺创建"},
            {"name": "宋代", "period": "960-1279", "significance": "佛教深入民间，祥符禅寺扩建"},
            {"name": "明代", "period": "1368-1644", "significance": "祥符禅寺兴盛，文人雅集"},
            {"name": "清代", "period": "1644-1912", "significance": "寺庙续修，文化积淀"},
            {"name": "现代", "period": "1949-至今", "significance": "灵山大佛建造（1997），景区全面开放"},
        ],
        "events": [
            {"name": "小灵山寺创建", "dynasty": "唐代", "year": "贞观年间",
             "description": "玄奘法师弟子在灵山脚下创建小灵山寺"},
            {"name": "祥符禅寺重建", "dynasty": "宋代", "year": "大中祥符年间",
             "description": "宋真宗赐名'祥符禅寺'"},
            {"name": "灵山大佛落成", "dynasty": "现代", "year": "1997",
             "description": "88米高青铜大佛竣工开光，成为世界最高露天青铜佛像"},
            {"name": "灵山梵宫开放", "dynasty": "现代", "year": "2009",
             "description": "被誉为佛教艺术的卢浮宫，世界佛教论坛主会场"},
            {"name": "拈花湾·禅意小镇开放", "dynasty": "现代", "year": "2015",
             "description": "禅意生活方式体验地，心灵度假目的地"},
        ],
        "figures": [
            {"name": "玄奘", "role": "唐代高僧", "connection": "弟子创建小灵山寺",
             "significance": "佛教翻译家、旅行家，间接奠定了灵山佛教基础"},
            {"name": "赵朴初", "role": "中国佛教协会会长",
             "connection": "提出'五方五佛'理念，推动灵山大佛建设",
             "significance": "现代佛教复兴代表人物"},
            {"name": "徐霞客", "role": "明代旅行家",
             "connection": "游历灵山区域，留下游记",
             "significance": "中国古代最著名的旅行家与地理学家"},
        ],
        "culture_concepts": [
            {"name": "五方五佛", "category": "佛教理念",
             "description": "赵朴初提出的中国五大佛像格局：东方灵山大佛、南方香港天坛大佛、西方四川乐山大佛、北方山西云冈大佛、中方河南龙门大佛"},
            {"name": "曼荼罗（坛城）", "category": "藏传佛教",
             "description": "佛教宇宙观的图示，五印坛城即以此为主题"},
            {"name": "禅修", "category": "修行方式",
             "description": "通过静坐冥想净化心灵，灵山提供禅修体验"},
        ],
    }


# ── Cypher builders ───────────────────────────────────────────────────────────


def build_create_nodes_cypher(kg: dict) -> list[tuple[str, dict]]:
    """Generate Cypher queries to create all nodes."""
    queries = []

    # Spot nodes
    for spot in kg.get("spots", []):
        query = """
        MERGE (s:Spot {id: $id})
        SET s.name = $name,
            s.category = $category,
            s.tags = $tags,
            s.overview = $overview,
            s.detail = $detail
        """
        queries.append((query, {
            "id": spot.get("id", ""),
            "name": spot.get("name", ""),
            "category": spot.get("category", ""),
            "tags": spot.get("tags", []),
            "overview": spot.get("overview", ""),
            "detail": spot.get("detail", ""),
        }))

    # Dynasty nodes
    for dynasty in kg.get("dynasties", []):
        query = """
        MERGE (d:Dynasty {name: $name})
        SET d.period = $period,
            d.significance = $significance
        """
        queries.append((query, dynasty))

    # Event nodes
    for event in kg.get("events", []):
        query = """
        MERGE (e:Event {name: $name})
        SET e.dynasty = $dynasty,
            e.year = $year,
            e.description = $description
        """
        queries.append((query, event))

    # Figure nodes
    for figure in kg.get("figures", []):
        query = """
        MERGE (f:Figure {name: $name})
        SET f.role = $role,
            f.connection = $connection,
            f.significance = $significance
        """
        queries.append((query, figure))

    # CultureConcept nodes
    for concept in kg.get("culture_concepts", []):
        query = """
        MERGE (c:CultureConcept {name: $name})
        SET c.category = $category,
            c.description = $description
        """
        queries.append((query, concept))

    # Category nodes
    categories = set(s.get("category", "") for s in kg.get("spots", []))
    for cat in categories:
        if cat:
            query = "MERGE (c:Category {name: $name})"
            queries.append((query, {"name": cat}))

    return queries


def build_create_relationships_cypher(kg: dict) -> list[tuple[str, dict]]:
    """Generate Cypher queries to create relationships between nodes."""
    queries = []

    # Spot → Category
    for spot in kg.get("spots", []):
        if spot.get("category"):
            query = """
            MATCH (s:Spot {id: $spot_id})
            MATCH (c:Category {name: $category})
            MERGE (s)-[:BELONGS_TO]->(c)
            """
            queries.append((query, {
                "spot_id": spot["id"],
                "category": spot["category"],
            }))

    # Spot → Related Spot
    for spot in kg.get("spots", []):
        for related_id in spot.get("related_spots", []):
            query = """
            MATCH (s1:Spot {id: $spot_id})
            MATCH (s2:Spot {id: $related_id})
            MERGE (s1)-[:RELATED_TO]->(s2)
            """
            queries.append((query, {
                "spot_id": spot["id"],
                "related_id": related_id,
            }))

    # Event → Dynasty
    for event in kg.get("events", []):
        query = """
        MATCH (e:Event {name: $event_name})
        MATCH (d:Dynasty {name: $dynasty})
        MERGE (e)-[:OCCURRED_IN]->(d)
        """
        queries.append((query, {
            "event_name": event["name"],
            "dynasty": event["dynasty"],
        }))

    # Event → Spot (heuristically link events to spots by keyword)
    for event in kg.get("events", []):
        for spot in kg.get("spots", []):
            spot_name = spot.get("name", "")
            event_name = event.get("name", "")
            if any(kw in event_name for kw in [spot_name, spot_name[:2]]):
                query = """
                MATCH (e:Event {name: $event_name})
                MATCH (s:Spot {id: $spot_id})
                MERGE (e)-[:HAPPENED_AT]->(s)
                """
                queries.append((query, {
                    "event_name": event["name"],
                    "spot_id": spot["id"],
                }))

    # Figure → Event
    figure_event_links = [
        ("玄奘", "小灵山寺创建"),
        ("赵朴初", "灵山大佛落成"),
        ("赵朴初", "灵山梵宫开放"),
    ]
    for figure_name, event_name in figure_event_links:
        query = """
        MATCH (f:Figure {name: $figure})
        MATCH (e:Event {name: $event})
        MERGE (f)-[:PARTICIPATED_IN]->(e)
        """
        queries.append((query, {"figure": figure_name, "event": event_name}))

    # Spot → CultureConcept (heuristic matching)
    concept_keywords = {
        "五方五佛": ["灵山大佛", "大佛"],
        "曼荼罗（坛城）": ["五印坛城", "坛城"],
        "禅修": ["禅", "祥符禅寺", "拈花湾"],
    }
    for concept_name, keywords in concept_keywords.items():
        for spot in kg.get("spots", []):
            spot_name = spot.get("name", "")
            spot_detail = spot.get("detail", "")
            if any(kw in spot_name or kw in spot_detail for kw in keywords):
                query = """
                MATCH (s:Spot {id: $spot_id})
                MATCH (c:CultureConcept {name: $concept})
                MERGE (s)-[:EMBODIES]->(c)
                """
                queries.append((query, {
                    "spot_id": spot["id"],
                    "concept": concept_name,
                }))

    return queries


# ── Main import function ──────────────────────────────────────────────────────


async def import_knowledge_graph(driver=None) -> dict:
    """Import the complete Lingshengjing knowledge graph into Neo4j.

    Args:
        driver: Optional Neo4j driver instance. Creates one if not provided.

    Returns:
        Dict with import statistics.
    """
    kg = get_lingshan_knowledge_graph()

    # Try to use Neo4j if available
    try:
        from neo4j import GraphDatabase
        from app.core.config import get_settings

        settings = get_settings()
        neo4j_uri = getattr(settings, "neo4j_uri", "bolt://localhost:7687")
        neo4j_user = getattr(settings, "neo4j_user", "neo4j")
        neo4j_password = getattr(settings, "neo4j_password", "password")

        if driver is None:
            driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

        with driver.session() as session:
            # Create constraints
            for constraint_query in CREATE_CONSTRAINTS:
                try:
                    session.run(constraint_query)
                except Exception as e:
                    logger.debug("Constraint (may already exist): %s", e)

            # Create nodes
            node_queries = build_create_nodes_cypher(kg)
            for query, params in node_queries:
                try:
                    session.run(query, params)
                except Exception as e:
                    logger.warning("Node creation failed: %s", e)

            # Create relationships
            rel_queries = build_create_relationships_cypher(kg)
            for query, params in rel_queries:
                try:
                    session.run(query, params)
                except Exception as e:
                    logger.warning("Relationship creation failed: %s", e)

        result = {
            "spots": len(kg.get("spots", [])),
            "dynasties": len(kg.get("dynasties", [])),
            "events": len(kg.get("events", [])),
            "figures": len(kg.get("figures", [])),
            "concepts": len(kg.get("culture_concepts", [])),
            "status": "imported",
        }

        logger.info("Knowledge graph imported: %s", result)
        return result

    except ImportError:
        logger.warning("neo4j package not installed, skipping Neo4j import. "
                       "Knowledge graph data is available in memory.")
        return {
            "status": "skipped",
            "reason": "neo4j package not installed",
            "data_available": {
                "spots": len(kg.get("spots", [])),
                "dynasties": len(kg.get("dynasties", [])),
                "events": len(kg.get("events", [])),
                "figures": len(kg.get("figures", [])),
                "concepts": len(kg.get("culture_concepts", [])),
            },
        }
    except Exception as e:
        logger.error("Neo4j import failed: %s", e)
        return {"status": "error", "reason": str(e)}


def get_spot_from_knowledge_graph(spot_id: str) -> dict | None:
    """Query a single spot from the knowledge graph (in-memory fallback)."""
    kg = get_lingshan_knowledge_graph()
    for spot in kg["spots"]:
        if spot["id"] == spot_id:
            return spot
    return None


def get_events_for_spot(spot_name: str) -> list[dict]:
    """Find historical events related to a spot."""
    kg = get_lingshan_knowledge_graph()
    related = []
    for event in kg["events"]:
        event_text = event["name"] + event.get("description", "")
        if spot_name[:2] in event_text or any(
            kw in event_text for kw in spot_name.split("寺")
        ):
            related.append(event)
    return related


# ── RAG corpus enhancement ────────────────────────────────────────────────────


def build_kg_text_corpus() -> list[dict]:
    """Convert knowledge graph data to text chunks for RAG ingestion.

    Each spot's knowledge is expanded into multiple text chunks covering
    historical background, cultural significance, and related events.
    """
    kg = get_lingshan_knowledge_graph()
    chunks = []

    for spot in kg.get("spots", []):
        spot_name = spot.get("name", "")
        spot_detail = spot.get("detail", "")
        spot_overview = spot.get("overview", "")

        # Base chunk: full detail
        chunks.append({
            "text": f"【{spot_name}】\n{spot_detail}",
            "metadata": {
                "spot_id": spot.get("id"),
                "spot_name": spot_name,
                "category": spot.get("category"),
                "chunk_type": "detail",
            },
        })

        # Overview chunk
        if spot_overview and spot_overview != spot_detail:
            chunks.append({
                "text": f"【{spot_name}】概述：{spot_overview}",
                "metadata": {
                    "spot_id": spot.get("id"),
                    "spot_name": spot_name,
                    "category": spot.get("category"),
                    "chunk_type": "overview",
                },
            })

        # Historical events related to this spot
        events = get_events_for_spot(spot_name)
        for event in events:
            chunks.append({
                "text": f"【{spot_name}】历史事件：{event['year']}，{event['name']}。{event.get('description', '')}",
                "metadata": {
                    "spot_id": spot.get("id"),
                    "spot_name": spot_name,
                    "chunk_type": "history",
                    "dynasty": event.get("dynasty"),
                },
            })

        # Cultural concepts
        for concept in kg.get("culture_concepts", []):
            concept_name = concept.get("name", "")
            if concept_name[:2] in spot_detail or spot_name[:2] in concept.get("description", ""):
                chunks.append({
                    "text": f"【{spot_name}】文化内涵：{concept_name}——{concept.get('description', '')}",
                    "metadata": {
                        "spot_id": spot.get("id"),
                        "spot_name": spot_name,
                        "chunk_type": "culture",
                        "concept": concept_name,
                    },
                })

    return chunks


if __name__ == "__main__":
    import asyncio

    logging.basicConfig(level=logging.INFO)
    result = asyncio.run(import_knowledge_graph())
    print(json.dumps(result, ensure_ascii=False, indent=2))

    corpus = build_kg_text_corpus()
    print(f"\nRAG corpus chunks: {len(corpus)}")
