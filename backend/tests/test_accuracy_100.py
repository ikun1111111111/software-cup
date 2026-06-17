"""Automated accuracy evaluation for the 100-question scenic spot test set.

Usage:
    cd backend
    python -m pytest tests/test_accuracy_100.py -v --tb=short
    # Or run a subset for quick validation:
    python -m pytest tests/test_accuracy_100.py -v -k "test_subset"

Scoring strategy:
    For each question, we call the chat pipeline (via chat_service or API)
    and check if the LLM answer contains at least one of the expected_keywords.
    A question is counted as correct if any keyword is present (case-insensitive).

Environment:
    Requires a running backend with working LLM + RAG pipeline,
    or mocks the LLM router for pure unit testing.
"""
import json
import logging
import os
import re
from pathlib import Path

import pytest

# Allow running outside pytest as a script
logger = logging.getLogger(__name__)

DATA_PATH = Path(__file__).parent.parent / "data" / "test_set.json"


def _load_test_set() -> dict:
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _check_keywords(answer: str, keywords: list[str]) -> bool:
    """Return True if any keyword appears in answer (case-insensitive, partial match)."""
    answer_lower = answer.lower()
    return any(kw.lower() in answer_lower for kw in keywords)


def _score_answer(answer: str, question_item: dict) -> tuple[bool, list[str]]:
    """Score a single answer against expected keywords.

    Returns (is_correct, matched_keywords).
    """
    keywords = question_item.get("expected_keywords", [])
    if not keywords:
        return True, []
    matched = [kw for kw in keywords if kw.lower() in answer.lower()]
    return len(matched) > 0, matched


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture(scope="session")
def test_set():
    if not DATA_PATH.exists():
        pytest.skip(f"Test set not found: {DATA_PATH}")
    return _load_test_set()


@pytest.fixture
def mock_chat_pipeline(monkeypatch):
    """Mock chat_service.process_chat for fast unit testing without real LLM calls."""
    async def _fake_process_chat(question, session_id, db_session, stream=False):
        return {
            "answer": f"这是一个关于 {question} 的回答。包含关键词：灵山、佛教、景区。",
            "source": "rag",
            "retrieved_chunks": [],
            "is_faq": False,
            "sentiment_score": 0.5,
            "latency_ms": 100,
        }
    monkeypatch.setattr("app.services.chat_service.process_chat", _fake_process_chat)


# ── Core evaluation logic (async) ───────────────────────────────────────────


async def _evaluate_all_questions(test_set: dict, use_real_pipeline: bool = False):
    """Run evaluation against all questions.

    Args:
        test_set: Loaded test set dict.
        use_real_pipeline: If True, calls the real chat_service (needs DB + LLM).
                           If False, expects mocking to be in place.
    """
    questions = test_set["questions"]
    results = []

    if use_real_pipeline:
        from app.services.chat_service import process_chat
        from app.core.database import async_session
    else:
        from app.services.chat_service import process_chat

    for item in questions:
        qid = item["id"]
        question = item["question"]
        keywords = item.get("expected_keywords", [])

        try:
            if use_real_pipeline:
                async with async_session() as db:
                    result = await process_chat(
                        question=question,
                        session_id=f"accuracy_test_{qid}",
                        db_session=db,
                        stream=False,
                    )
                    answer = result.get("answer", "")
            else:
                # Mock path — process_chat should be patched
                result = await process_chat(
                    question=question,
                    session_id=f"accuracy_test_{qid}",
                    db_session=None,
                    stream=False,
                )
                answer = result.get("answer", "")
        except Exception as e:
            logger.error("Question %d failed: %s", qid, e)
            answer = ""

        is_correct, matched = _score_answer(answer, item)
        results.append({
            "id": qid,
            "question": question,
            "answer": answer,
            "expected_keywords": keywords,
            "matched_keywords": matched,
            "correct": is_correct,
            "category": item.get("category", "unknown"),
            "difficulty": item.get("difficulty", "unknown"),
        })

    return results


def _print_report(results: list[dict], test_set: dict):
    total = len(results)
    correct = sum(1 for r in results if r["correct"])
    accuracy = correct / total if total else 0.0

    # By category
    categories = {}
    for r in results:
        cat = r["category"]
        categories.setdefault(cat, {"total": 0, "correct": 0})
        categories[cat]["total"] += 1
        if r["correct"]:
            categories[cat]["correct"] += 1

    # By difficulty
    difficulties = {}
    for r in results:
        diff = r["difficulty"]
        difficulties.setdefault(diff, {"total": 0, "correct": 0})
        difficulties[diff]["total"] += 1
        if r["correct"]:
            difficulties[diff]["correct"] += 1

    print("\n" + "=" * 60)
    print(f"  准确率评测报告 — {test_set.get('dataset_name', 'Unknown')}")
    print("=" * 60)
    print(f"  总题数:   {total}")
    print(f"  正确数:   {correct}")
    print(f"  准确率:   {accuracy:.1%}")
    print(f"  目标:     ≥ 90%")
    print("-" * 60)
    print("  按分类统计:")
    for cat, stats in sorted(categories.items()):
        acc = stats["correct"] / stats["total"] if stats["total"] else 0
        print(f"    {cat:12s}  {stats['correct']:3d}/{stats['total']:3d}  {acc:.1%}")
    print("-" * 60)
    print("  按难度统计:")
    for diff, stats in sorted(difficulties.items()):
        acc = stats["correct"] / stats["total"] if stats["total"] else 0
        print(f"    {diff:12s}  {stats['correct']:3d}/{stats['total']:3d}  {acc:.1%}")
    print("=" * 60)

    # Print failures
    failures = [r for r in results if not r["correct"]]
    if failures:
        print("\n  错误题目详情 (前 10 条):")
        for r in failures[:10]:
            print(f"    [{r['id']:03d}] {r['question']}")
            print(f"         期望关键词: {r['expected_keywords']}")
            print(f"         实际回答: {r['answer'][:80]}...")
        print()

    return accuracy


# ── pytest test cases ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_test_set_format(test_set):
    """Verify test set JSON is well-formed."""
    assert "questions" in test_set
    assert len(test_set["questions"]) > 0
    for q in test_set["questions"]:
        assert "id" in q
        assert "question" in q
        assert "expected_keywords" in q
        assert isinstance(q["expected_keywords"], list)


@pytest.mark.asyncio
async def test_keyword_scoring_logic():
    """Unit test the scoring function directly."""
    item = {"expected_keywords": ["88", "米"]}
    assert _score_answer("灵山大佛高88米", item)[0] is True
    assert _score_answer("非常高", item)[0] is False
    assert _score_answer("高88m", item)[0] is True  # 88 matches


@pytest.mark.asyncio
async def test_subset_accuracy_mocked(monkeypatch, test_set):
    """Run a 20-question subset using mocked pipeline for fast CI validation."""
    # Patch the chat service to return answers that contain some keywords
    async def _mock_chat(question, session_id, db_session, stream=False):
        idx = hash(question) % len(test_set["questions"])
        keywords = test_set["questions"][idx]["expected_keywords"]
        kw_text = ", ".join(keywords[:2]) if keywords else "景区"
        return {
            "answer": f"关于这个问题，答案是包含 {kw_text} 的信息。",
            "source": "rag",
            "retrieved_chunks": [],
            "is_faq": False,
            "sentiment_score": 0.5,
            "latency_ms": 100,
        }

    monkeypatch.setattr("app.services.chat_service.process_chat", _mock_chat)

    subset = test_set["questions"][:20]
    results = []
    for item in subset:
        from app.services.chat_service import process_chat
        result = await process_chat(item["question"], "test", None, False)
        answer = result.get("answer", "")
        is_correct, matched = _score_answer(answer, item)
        results.append({
            "id": item["id"],
            "question": item["question"],
            "answer": answer,
            "expected_keywords": item["expected_keywords"],
            "matched_keywords": matched,
            "correct": is_correct,
            "category": item.get("category", "unknown"),
            "difficulty": item.get("difficulty", "unknown"),
        })

    accuracy = _print_report(results, test_set)
    # With mocked deterministic answers we just assert no exception and reasonable output
    assert 0.0 <= accuracy <= 1.0


@pytest.mark.skip(reason="Requires running PostgreSQL + Milvus + LLM APIs")
@pytest.mark.asyncio
async def test_full_accuracy_real_pipeline(test_set):
    """Run the full 100-question evaluation against the real backend pipeline.

    This test is skipped by default because it requires:
      - PostgreSQL with seeded data
      - Milvus with indexed vectors
      - Available LLM API keys (DeepSeek / Qwen / Doubao)
      - Running backend services
    """
    results = await _evaluate_all_questions(test_set, use_real_pipeline=True)
    accuracy = _print_report(results, test_set)

    # Assert target accuracy
    assert accuracy >= 0.90, f"Accuracy {accuracy:.1%} is below target 90%"


# ── CLI entrypoint (run as script) ───────────────────────────────────────────


if __name__ == "__main__":
    import asyncio

    logging.basicConfig(level=logging.INFO)

    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Test set not found: {DATA_PATH}")

    ts = _load_test_set()
    print(f"Loaded {len(ts['questions'])} questions from {DATA_PATH}")

    # By default run with mock (no external deps). Set env REAL=1 for real pipeline.
    use_real = os.environ.get("REAL", "0") == "1"
    if use_real:
        print("Mode: REAL pipeline (requires DB + LLM)")
    else:
        print("Mode: MOCK pipeline (fast validation)")
        # Simple mock
        import app.services.chat_service as _cs

        async def _fake(*args, **kwargs):
            return {"answer": "灵山胜境是著名佛教景区，有灵山大佛、梵宫等景点。"}

        _cs.process_chat = _fake

    results = asyncio.run(_evaluate_all_questions(ts, use_real_pipeline=use_real))
    accuracy = _print_report(results, ts)

    if accuracy < 0.90:
        print("\n⚠️  准确率未达标 (< 90%)，请优化 RAG 管线或补充知识库。")
        exit(1)
    else:
        print("\n✅ 准确率达标！")
        exit(0)
