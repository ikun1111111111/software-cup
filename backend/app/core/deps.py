from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User


security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=401, detail="未登录")

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token 无效或已过期")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token 缺少用户信息")

    user = await db.get(User, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="用户不存在或已停用")
    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not credentials:
        return None

    payload = decode_token(credentials.credentials)
    if not payload or not payload.get("sub"):
        return None

    return await db.get(User, int(payload["sub"]))
