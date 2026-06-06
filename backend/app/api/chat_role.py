"""Chat role-play API — multi-character guided tour (M13)."""
import json
import logging
import time

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rag import retrieve
from app.core.llm_router import LLMTask, route, route_stream
from app.core.prompts import build_role_prompt, ROLE_PROMPTS, ROLE_NAMES

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat-role"])


class RoleInfo(BaseModel):
    role_id: str
    name: str
    description: str


class RoleListResponse(BaseModel):
    roles: list[RoleInfo]


class RoleChatRequest(BaseModel):
    session_id: str
    question: str
    role: str = "default"
    stream: bool = True


class RoleSwitchRequest(BaseModel):
    session_id: str
    role: str


class RoleSwitchResponse(BaseModel):
    status: str
    role: str
    role_name: str
    greeting: str


ROLE_GREETINGS: dict[str, str] = {
    "buddha": "阿弥陀佛，善哉善哉。贫僧愿为施主解惑答疑，有何疑问但说无妨。",
    "zen_master": "清风明月，禅心自在。施主有何惑？且随老衲一观。",
    "tourist": "嗨！我刚逛完灵山，超好玩的！有什么想知道的尽管问我~",
    "historian": "余游历天下，今日驻足灵山。此地形胜非凡，客官有何见教？",
    "default": "您好！我是数字人导游小景，很高兴为您服务。请问有什么想了解的？",
}


@router.get("/roles", response_model=RoleListResponse)
async def list_roles():
    """List available chat roles."""
    roles = [
        RoleInfo(role_id="default", name="数字人导游", description="默认导游角色，亲切专业"),
    ]
    for role_id, prompt in ROLE_PROMPTS.items():
        roles.append(RoleInfo(
            role_id=role_id,
            name=ROLE_NAMES.get(role_id, role_id),
            description=prompt[:50] + "...",
        ))
    return RoleListResponse(roles=roles)


@router.post("/role", response_model=RoleSwitchResponse)
async def switch_role(request: RoleSwitchRequest):
    """Switch chat role and return greeting."""
    role = request.role
    if role != "default" and role not in ROLE_PROMPTS:
        raise HTTPException(status_code=400, detail=f"未知角色: {role}")

    return RoleSwitchResponse(
        status="ok",
        role=role,
        role_name=ROLE_NAMES.get(role, "数字人导游"),
        greeting=ROLE_GREETINGS.get(role, ROLE_GREETINGS["default"]),
    )


@router.post("/role/stream")
async def role_chat_stream(request: RoleChatRequest):
    """Streaming chat with role-based persona."""
    role = request.role
    if role != "default" and role not in ROLE_PROMPTS:
        raise HTTPException(status_code=400, detail=f"未知角色: {role}")

    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    start_time = time.time()

    # RAG retrieval
    try:
        chunks = await retrieve(question)
    except Exception as e:
        logger.error("RAG retrieval failed: %s", e)
        chunks = []

    messages = build_role_prompt(role, question, chunks)

    async def token_generator():
        tokens = []
        try:
            for i, chunk in enumerate(chunks[:3]):
                yield (
                    f"event: chunk\n"
                    f"data: {json.dumps({'index': i, 'text': chunk.get('text', '')[:200]}, ensure_ascii=False)}\n\n"
                )

            async for token in route_stream(LLMTask.chat, messages):
                tokens.append(token)
                yield (
                    f"event: token\n"
                    f"data: {json.dumps({'token': token, 'index': len(tokens) - 1}, ensure_ascii=False)}\n\n"
                )

            latency_ms = int((time.time() - start_time) * 1000)
            yield f"event: done\ndata: {json.dumps({'answer': ''.join(tokens), 'role': role, 'latency_ms': latency_ms}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error("Role chat stream failed: %s", e)
            yield (
                f"event: error\n"
                f"data: {json.dumps({'error': '生成回答时出错，请稍后重试'}, ensure_ascii=False)}\n\n"
            )

    return StreamingResponse(
        token_generator(),
        media_type="text/event-stream",
    )
