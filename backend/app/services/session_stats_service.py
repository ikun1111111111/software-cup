"""Session statistics service: aggregate tour events and interaction logs."""
import logging
from datetime import datetime
from typing import Any

from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interaction import InteractionLog
from app.models.mobile_event import MobileTourEvent

logger = logging.getLogger(__name__)


class SessionStats(BaseModel):
    session_id: str
    event_count: int
    narration_count: int
    question_count: int
    checkin_count: int
    memory_count: int
    candidates: list[dict[str, Any]]


async def get_session_stats(session_id: str, db: AsyncSession) -> dict[str, Any]:
    """Aggregate mobile tour events and chat interactions for a session."""
    if not session_id:
        return _empty_stats(session_id)

    # Count mobile tour events by type
    event_stmt = select(
        MobileTourEvent.event_name,
        func.count(MobileTourEvent.id),
    ).where(MobileTourEvent.session_id == session_id).group_by(MobileTourEvent.event_name)
    event_counts = {name: count for name, count in (await db.execute(event_stmt)).all()}

    # Count interaction logs (questions asked)
    interaction_stmt = select(func.count(InteractionLog.id)).where(
        InteractionLog.session_id == session_id
    )
    interaction_count = (await db.execute(interaction_stmt)).scalar() or 0

    narration_count = event_counts.get('narration_played', 0)
    checkin_count = event_counts.get('checkin_completed', 0)
    question_asked_events = event_counts.get('question_asked', 0)
    total_mobile_events = sum(event_counts.values())

    # Total "events" shown in the AI album panel = mobile events + chat turns
    event_count = total_mobile_events + interaction_count
    question_count = question_asked_events + interaction_count

    candidates = await _build_candidates(session_id, db)

    return {
        "session_id": session_id,
        "event_count": event_count,
        "narration_count": narration_count,
        "question_count": question_count,
        "checkin_count": checkin_count,
        "memory_count": 0,  # populated by caller from memory list
        "candidates": candidates,
    }


def _empty_stats(session_id: str) -> dict[str, Any]:
    return {
        "session_id": session_id,
        "event_count": 0,
        "narration_count": 0,
        "question_count": 0,
        "checkin_count": 0,
        "memory_count": 0,
        "candidates": [],
    }


async def _build_candidates(session_id: str, db: AsyncSession) -> list[dict[str, Any]]:
    """Build memory graph candidates from recent interactions and tour events."""
    candidates: list[dict[str, Any]] = []
    seen_questions: set[str] = set()

    # Recent chat questions become ask candidates
    interaction_stmt = select(InteractionLog).where(
        InteractionLog.session_id == session_id
    ).order_by(InteractionLog.created_at.desc()).limit(20)
    interactions = list((await db.execute(interaction_stmt)).scalars().all())

    for log in interactions:
        question = (log.user_input or '').strip()
        if not question:
            continue
        # Deduplicate identical questions
        normalized = question.lower().replace('？', '?').replace(' ', '')
        if normalized in seen_questions:
            continue
        seen_questions.add(normalized)

        answer = (log.llm_response or '').strip()
        title = f"问小灵：{question}" if not question.startswith('问小灵') else question
        candidates.append({
            "eventId": f"interaction_{log.id}",
            "eventType": "ask",
            "title": title,
            "content": answer[:160] + ('...' if len(answer) > 160 else ''),
            "spotName": _extract_spot_name(answer),
            "spotId": None,
            "createdAt": log.created_at.isoformat() if log.created_at else datetime.utcnow().isoformat(),
            "sourceType": "chat",
            "sourcePage": log.metadata_json.get('source_page') if log.metadata_json else None,
            "routeId": None,
            "routeName": None,
            "metadata": {
                "interaction_id": log.id,
                "input_type": log.input_type,
            },
        })

    # Recent tour events become narration/checkin candidates
    event_stmt = select(MobileTourEvent).where(
        MobileTourEvent.session_id == session_id,
        MobileTourEvent.event_name.in_([
            'narration_played',
            'checkin_completed',
            'route_started',
            'route_completed',
        ]),
    ).order_by(MobileTourEvent.created_at.desc()).limit(20)
    events = list((await db.execute(event_stmt)).scalars().all())

    for event in events:
        event_type = event.event_name
        if event_type == 'narration_played':
            title = event.spot_name or '景点讲解'
            content = f"在{title}听了一段讲解"
            candidate_type = 'narration'
        elif event_type == 'checkin_completed':
            title = event.spot_name or '景点打卡'
            content = f"在{title}完成打卡"
            candidate_type = 'checkin'
        elif event_type == 'route_started':
            title = event.route_name or '开始导览'
            content = f"开始了{title}"
            candidate_type = 'start_route'
        else:
            title = event.route_name or '完成导览'
            content = f"完成了{title}"
            candidate_type = 'finish_route'

        candidates.append({
            "eventId": f"event_{event.id}",
            "eventType": candidate_type,
            "title": title,
            "content": content,
            "spotName": event.spot_name,
            "spotId": event.spot_id,
            "createdAt": event.created_at.isoformat() if event.created_at else datetime.utcnow().isoformat(),
            "sourceType": event.source_page or 'tour',
            "sourcePage": event.source_page,
            "routeId": event.route_id,
            "routeName": event.route_name,
            "metadata": event.metadata_json or {},
        })

    # Sort by createdAt descending, limit to 20
    candidates.sort(key=lambda x: x.get('createdAt') or '', reverse=True)
    return candidates[:20]


def _extract_spot_name(answer: str) -> str | None:
    """Naive spot name extraction from answer text."""
    if not answer:
        return None
    # Look for "在XXX" or "这里是XXX" patterns
    markers = ['在', '位于', '这里是', '指的是']
    for marker in markers:
        idx = answer.find(marker)
        if idx >= 0:
            rest = answer[idx + len(marker):]
            # Take up to next punctuation
            end = len(rest)
            for p in ['，', '。', '、', '；', '？', '!', ' ']:
                pidx = rest.find(p)
                if 0 < pidx < end:
                    end = pidx
            candidate = rest[:end].strip()
            if candidate and len(candidate) <= 20:
                return candidate
    return None
