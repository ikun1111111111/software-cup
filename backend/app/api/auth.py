from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User


router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterReq(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=6, max_length=64)
    nickname: str | None = None


class LoginReq(BaseModel):
    username: str
    password: str


class UpdateProfileReq(BaseModel):
    nickname: str | None = None
    avatar: str | None = None


class ChangePasswordReq(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6, max_length=64)


def _user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "nickname": user.nickname,
        "avatar": user.avatar,
        "role": user.role,
    }


@router.post("/register")
async def register(req: RegisterReq, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.username == req.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="用户名已存在")

    user = User(
        username=req.username,
        hashed_password=get_password_hash(req.password),
        nickname=req.nickname or req.username,
        role="tourist",
        is_active=True,
    )
    db.add(user)
    await db.flush()
    token = create_access_token(user.id, user.username)
    await db.commit()
    await db.refresh(user)
    return {"token": token, "user": _user_to_dict(user)}


@router.post("/login")
async def login(req: LoginReq, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已停用")

    token = create_access_token(user.id, user.username)
    return {"token": token, "user": _user_to_dict(user)}


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return _user_to_dict(user)


@router.put("/profile")
async def update_profile(
    req: UpdateProfileReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.nickname is not None:
        user.nickname = req.nickname
    if req.avatar is not None:
        user.avatar = req.avatar
    await db.commit()
    await db.refresh(user)
    return _user_to_dict(user)


@router.post("/change-password")
async def change_password(
    req: ChangePasswordReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(req.old_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="原密码错误")
    user.hashed_password = get_password_hash(req.new_password)
    await db.commit()
    return {"message": "密码修改成功"}
