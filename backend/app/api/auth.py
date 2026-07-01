from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import (
    get_password_hash, verify_password, create_access_token,
)
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


# --- Schemas ---
class RegisterReq(BaseModel):
    username: str = Field(..., min_length=3, max_length=20, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=6, max_length=32)
    nickname: str | None = None


class LoginReq(BaseModel):
    username: str
    password: str


class UpdateProfileReq(BaseModel):
    nickname: str | None = None
    avatar: str | None = None


class ChangePasswordReq(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=32)


class TokenRes(BaseModel):
    token: str
    user: dict


class UserRes(BaseModel):
    id: int
    username: str
    nickname: str | None
    avatar: str | None
    role: str


# --- Helpers ---
def _user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "nickname": user.nickname,
        "avatar": user.avatar,
        "role": user.role,
    }


# --- Endpoints ---
@router.post("/register", response_model=TokenRes)
async def register(req: RegisterReq, db: AsyncSession = Depends(get_db)):
    """用户注册，自动登录"""
    existing = await db.execute(select(User).where(User.username == req.username))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "用户名已存在")

    user = User(
        username=req.username,
        hashed_password=get_password_hash(req.password),
        nickname=req.nickname or req.username,
    )
    db.add(user)
    await db.flush()
    await db.commit()

    token = create_access_token(user.id, user.username)
    return TokenRes(token=token, user=_user_to_dict(user))


@router.post("/login", response_model=TokenRes)
async def login(req: LoginReq, db: AsyncSession = Depends(get_db)):
    """用户登录"""
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(401, "用户名或密码错误")
    if not user.is_active:
        raise HTTPException(403, "账号已被禁用")

    token = create_access_token(user.id, user.username)
    return TokenRes(token=token, user=_user_to_dict(user))


@router.get("/me", response_model=UserRes)
async def get_me(user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return _user_to_dict(user)


@router.put("/profile", response_model=UserRes)
async def update_profile(
    req: UpdateProfileReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新个人资料"""
    if req.nickname is not None:
        user.nickname = req.nickname
    if req.avatar is not None:
        user.avatar = req.avatar
    await db.commit()
    return _user_to_dict(user)


@router.post("/change-password")
async def change_password(
    req: ChangePasswordReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """修改密码"""
    if not verify_password(req.old_password, user.hashed_password):
        raise HTTPException(400, "原密码错误")
    user.hashed_password = get_password_hash(req.new_password)
    await db.commit()
    return {"message": "密码修改成功"}
