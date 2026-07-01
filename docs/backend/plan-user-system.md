# 用户系统方案

> 版本: v1.0 | 日期: 2026-06-17
> 平台: React Native (Expo) + FastAPI
> 核心理念: 轻量认证 · 无缝集成 · 渐进保护

---

## 1. 现状分析

| 层 | 已有 | 缺失 |
|---|---|---|
| 后端模型 | `TouristProfile`（session_id 匿名） | `User` 表（username/password） |
| 后端 API | 无认证相关路由 | 注册/登录/登出/Me 接口 |
| 后端中间件 | CORS 已配置 | JWT 鉴权中间件/依赖 |
| 前端状态 | `useUserStore`（Zustand）已定义 | 未接入实际登录逻辑 |
| 前端请求 | Axios token 拦截器已存在 | 401 自动跳转登录页 |
| 前端页面 | 无 | 登录/注册页面、路由守卫 |

### 1.1 与导览系统的关系

当前导览系统（TourOrchestrator）基于 `session_id` 匿名运行，用户系统上线后：

```
─────────────────────────────────────────────────────────────┐
│                      用户认证层                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ 注册/登录 │───▶│ JWT Token │───▶│ 请求拦截器│             │
│  └──────────┘    └──────────┘    └──────────┘             │
│                          │                                  │
│  ┌───────────────────────▼───────────────────────────────┐   │
│  │              User 身份层                               │   │
│  │                                                       │   │
│  │  user_id ──── 关联 ────▶ TouristProfile.session_id    │   │
│  │                                                       │   │
│  │  用户数据（用户名/密码/角色）  │  行为数据（兴趣/历史/DNA）│   │
│  └───────────────────────────────────────────────────────┘   │
│                          │                                  │
│  ┌───────────────────────▼───────────────────────────────┐   │
│  │              导览系统层（TourOrchestrator）              │   │
│  │                                                       │   │
│  │  登录用户 → 持久化打卡记录、旅行记忆、偏好               │   │
│  │  匿名用户 → 仅 session 内有效，关闭即失                  │   │
│  └───────────────────────────────────────────────────────┘   │
─────────────────────────────────────────────────────────────┘
```

**核心思路**：User 表和 TouristProfile 表通过 `user_id` 关联，登录用户的导览数据可持久化，匿名用户仅 session 内有效。

---

## 2. 设计原则

- **最小改动**：不动现有 TouristProfile 和 session 体系，新增 User 表独立运行
- **JWT 无状态**：token 存前端 AsyncStorage，后端不存 session
- **密码安全**：bcrypt 哈希，不存明文
- **渐进接入**：先加认证基础设施，再逐步给 API 加保护
- **双轨并行**：登录用户和匿名用户都能使用导览功能，体验差异在数据持久化

---

## 3. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户认证系统                             │
─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                  前端层                                │   │
│  │                                                       │   │
│  │  ┌──────────┐  ┌──────────┐  ──────────┐           │   │
│  │  │ 登录页面  │  │ 注册页面  │  │ 个人中心  │           │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘           │   │
│  │       │              │              │                 │   │
│  │  ┌────▼──────────────▼──────────────▼────           │   │
│  │  │           useAuth Hook                 │           │   │
│  │  │  login / register / logout / restore   │           │   │
│  │  └────────────────┬───────────────────────┘           │   │
│  │                   │                                    │   │
│  │  ┌────────────────▼───────────────────────┐           │   │
│  │  │         Axios 请求拦截器                │           │   │
│  │  │  自动携带 Token / 401 自动跳转登录       │           │   │
│  │  └────────────────┬───────────────────────┘           │   │
│  └───────────────────┼───────────────────────────────────┘   │
│                      │ HTTP                                    │
│  ┌───────────────────▼───────────────────────────────────┐   │
│  │                  后端层                                │   │
│  │                                                       │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │           /api/auth 路由组                    │    │   │
│  │  │  POST /register  POST /login  GET /me        │    │   │
│  │  │  PUT /profile  POST /change-password         │    │   │
│  │  └──────────────────────┬───────────────────────┘    │   │
│  │                         │                             │   │
│  │  ┌──────────────────────▼───────────────────────┐    │   │
│  │  │          认证依赖（拦截器）                    │    │   │
│  │  │  get_current_user (必须登录)                  │    │   │
│  │  │  get_current_user_optional (可选)             │    │   │
│  │  └──────────────────────┬───────────────────────┘    │   │
│  │                         │                             │   │
│  │  ──────────────────────▼───────────────────────    │   │
│  │  │           JWT 工具层                          │    │   │
│  │  │  create_access_token / decode_token           │    │   │
│  │  │  verify_password / get_password_hash          │    │   │
│  │  └──────────────────────┬───────────────────────┘    │   │
│  ─────────────────────────┼─────────────────────────────┘   │
│                            │                                  │
│  ┌─────────────────────────▼─────────────────────────────┐   │
│  │                  数据层                                │   │
│  │                                                       │   │
│  │  ──────────────┐         ┌──────────────────────┐   │   │
│  │  │  users 表     │◀──FK───▶│  tourist_profiles 表  │   │   │
│  │  │ (认证身份)    │  user_id │  (行为数据)           │   │   │
│  │  └──────────────┘         └──────────────────────┘   │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 数据模型

### 4.1 User 表（新增）

`backend/app/models/user.py`

```python
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(128), nullable=False)
    nickname: Mapped[str | None] = mapped_column(String(50), nullable=True)
    avatar: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="tourist")  # tourist / admin
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # 关联 TouristProfile（一个用户可有多个 session 的行为记录）
    profiles: Mapped[list["TouristProfile"]] = relationship(back_populates="user", lazy="selectin")
```

### 4.2 TouristProfile 扩展（关联 User）

在现有 `TouristProfile` 中添加 `user_id` 外键：

```python
# 在 tourist.py 中添加
user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
user: Mapped["User | None"] = relationship(back_populates="profiles")
```

**关联逻辑**：
- 登录用户访问时，`user_id` 填充当前用户 ID
- 匿名用户访问时，`user_id` 为 NULL，仅靠 `session_id` 标识
- 一个 User 可以有多个 TouristProfile（不同设备/浏览器 session）

### 4.3 表关系图

```
┌──────────────────────┐          ┌──────────────────────────┐
│       users          │          │    tourist_profiles       │
──────────────────────┤          ├──────────────────────────┤
│ id          (PK)     │──┐       │ id              (PK)     │
│ username    (UK)     │  │  1:N  │ session_id      (UK)     │
│ hashed_password      │  ├──────▶│ user_id         (FK)     │
│ nickname             │  │       │ interests       (JSON)   │
│ avatar               │  │       │ visit_history   (JSON)   │
│ role                 │  │       │ dna_type                 │
│ is_active            │  │       │ ...                      │
│ created_at           │  │       └──────────────────────────┘
│ updated_at           │  │
└──────────────────────┘  │
                          │  说明：
                          │  - 登录用户：user_id 有值，数据持久化
                          │  - 匿名用户：user_id = NULL，session 结束即失
                          └─ 一个用户可在多端登录，产生多个 profile
```

---

## 5. 后端改动

### 5.1 JWT 工具

`backend/app/core/security.py`

```python
from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import get_settings

settings = get_settings()

SECRET_KEY = settings.jwt_secret_key  # 需在 config 和 .env 中添加
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 天

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(user_id: int, username: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "username": username, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
```

### 5.2 认证依赖（拦截器）

`backend/app/core/deps.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """受保护路由使用此依赖，未登录返回 401"""
    if not credentials:
        raise HTTPException(status_code=401, detail="未登录")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token 无效或已过期")
    user = await db.get(User, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="用户不存在或已禁用")
    return user

async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """可选认证：有 token 就解析，没有也不报错"""
    if not credentials:
        return None
    payload = decode_token(credentials.credentials)
    if not payload:
        return None
    return await db.get(User, int(payload["sub"]))
```

### 5.3 认证 API

`backend/app/api/auth.py`

```python
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
    await db.commit()
    await db.refresh(user)

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
    await db.refresh(user)
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

# --- Helpers ---
def _user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "nickname": user.nickname,
        "avatar": user.avatar,
        "role": user.role,
    }
```

注册到 `backend/app/main.py`：
```python
from app.api import auth
app.include_router(auth.router)
```

### 5.4 Config 补充

`backend/app/core/config.py` 添加：
```python
jwt_secret_key: str = "your-secret-key-change-in-production"  # .env 中配置
```

### 5.5 依赖补充

`backend/requirements.txt` 添加：
```
passlib[bcrypt]==1.7.4
python-jose[cryptography]==3.3.0  # 已存在
```

---

## 6. 前端改动

### 6.1 Auth API 封装

`software/mobile/api/auth.ts`（新建）

```typescript
import { post, get, put } from './request';

export const authApi = {
  register: (username: string, password: string, nickname?: string) =>
    post('/api/auth/register', { username, password, nickname }),
  login: (username: string, password: string) =>
    post('/api/auth/login', { username, password }),
  getMe: () => get('/api/auth/me'),
  updateProfile: (data: { nickname?: string; avatar?: string }) =>
    put('/api/auth/profile', data),
  changePassword: (oldPassword: string, newPassword: string) =>
    post('/api/auth/change-password', { old_password: oldPassword, new_password: newPassword }),
};
```

### 6.2 Auth Hook

`software/mobile/hooks/useAuth.ts`（新建）

```typescript
import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserStore } from '@/stores/userStore';
import { authApi } from '@/api/auth';
import { useRouter } from 'expo-router';

export function useAuth() {
  const { user, setUser, clearUser } = useUserStore();
  const router = useRouter();

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password);
    const { token, user: userData } = res.data;
    await AsyncStorage.setItem('token', token);
    setUser(userData);
    return userData;
  }, [setUser]);

  const register = useCallback(async (username: string, password: string, nickname?: string) => {
    const res = await authApi.register(username, password, nickname);
    const { token, user: userData } = res.data;
    await AsyncStorage.setItem('token', token);
    setUser(userData);
    return userData;
  }, [setUser]);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem('token');
    clearUser();
    router.replace('/auth/login');
  }, [clearUser, router]);

  const restoreSession = useCallback(async () => {
    const token = await AsyncStorage.getItem('token');
    if (!token) return;
    try {
      const res = await authApi.getMe();
      setUser(res.data);
    } catch {
      await AsyncStorage.removeItem('token');
      clearUser();
    }
  }, [setUser, clearUser]);

  return { user, login, register, logout, restoreSession };
}
```

### 6.3 请求拦截器增强

修改 `software/mobile/api/request.ts`，在 response 拦截器中加 401 处理：

```typescript
import { EventEmitter } from 'events';

// 全局事件：401 时通知路由跳转
export const authEvents = new EventEmitter();

instance.interceptors.response.use(
  (response) => {
    const { data } = response;
    if (data && typeof data.code === 'number' && data.code !== 0 && data.code !== 200) {
      return Promise.reject(new Error(data.message));
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      authEvents.emit('unauthorized');  // 通知 _layout 跳转登录页
    }
    return Promise.reject(error);
  },
);
```

### 6.4 登录页面线框图

```
┌─────────────────────────────────────┐
│                                     │
│         ┌───────────────┐           │
│         │    ️ 灵山     │           │
│         │  智慧导览系统   │           │
│         └───────────────┘           │
│                                     │
│         欢迎回来                      │
│         ────────────                 │
│                                     │
│    ┌─────────────────────────────┐  │
│    │  👤  用户名                   │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────  │
│    │  🔒  密码                     │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │         登  录               │  │ ← 禅意绿色 #6A9C89
│    └─────────────────────────────┘  │
│                                     │
│         还没有账号？去注册 →          │
│                                     │
│    ┌─────────────────────────────  │
│    │      先逛逛（游客模式）       │  │ ← 次要按钮
│    └─────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### 6.5 注册页面线框图

```
┌─────────────────────────────────────┐
│  ← 返回                             │
│                                     │
│         创建账号                      │
│         ─────────────                 │
│                                     │
│    ┌─────────────────────────────┐  │
│    │    用户名（3-20位字母数字）  │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │  🔒  密码（6-32位）           │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │  🔒  确认密码                 │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │  👤  昵称（选填）             │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │         注  册               │  │
│    ─────────────────────────────┘  │
│                                     │
│         已有账号？去登录 →            │
│                                     │
└─────────────────────────────────────┘
```

### 6.6 个人中心页面线框图

```
┌─────────────────────────────────────┐
│  ← 返回                    设置 ⚙️   │
│                                     │
│    ┌─────────────────────────────┐  │
│    │  🧘                          │  │
│    │  用户名                       │  │
│    │  昵称 · tourist              │  │
│    ─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │  📊 旅行统计                  │  │
│    │  已打卡 3/12 个景点           │  │
│    │  累计游览 2 小时              │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │  🏅 我的印章                  │  │
│    │  [菩提大道] [梵宫] [大佛]    │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │  ✏️ 修改资料                  │  │
│    │  🔑 修改密码                  │  │
│    │  📋 导览偏好设置              │  │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────────┐  │
│    │      退出登录                │  │ ← 红色
│    └─────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### 6.7 路由守卫

修改 `software/mobile/app/_layout.tsx`：

```typescript
// 公开路由（不需要登录）
const PUBLIC_ROUTES = ['/auth/login', '/auth/register'];

// 在 RootLayout 中：
useEffect(() => {
  restoreSession(); // 尝试恢复登录态

  // 监听 401 事件
  const handler = () => router.replace('/auth/login');
  authEvents.on('unauthorized', handler);
  return () => authEvents.off('unauthorized', handler);
}, []);
```

**页面级保护**：在需要登录的页面组件内：
```typescript
const { user } = useUserStore();
if (!user) return <Redirect href="/auth/login" />;
```

---

## 7. 与导览系统的集成

### 7.1 登录用户 vs 匿名用户

| 功能 | 登录用户 | 匿名用户 |
|------|---------|---------|
| 浏览景点 | ✅ | ✅ |
| 开始导览 | ✅ | ✅ |
| 打卡景点 | ✅ 持久化 | ✅ 仅 session 内 |
| 旅行记忆 | ✅ 跨设备 | ❌ |
| 印章收集 | ✅ 持久化 | ✅ 仅 session 内 |
| 导览偏好 | ✅ 持久化 | ✅ 仅 session 内 |
| 对话历史 | ✅ 持久化 | ❌ |

### 7.2 登录后数据合并

当匿名用户登录后，需要将 session 内的临时数据合并到用户账号：

```
┌─────────────────────────────────────────────────────────────┐
│                    登录数据合并流程                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 用户以匿名身份浏览、打卡、收集印章                        │
│     └─ 数据存在 TouristProfile(session_id="abc123", user_id=NULL) │
│                                                             │
│  2. 用户点击登录 → 认证成功                                  │
│     └─ 获取 user_id = 42                                    │
│                                                             │
│  3. 后端自动合并：                                           │
│     UPDATE tourist_profiles                                 │
│     SET user_id = 42                                        │
│     WHERE session_id = "abc123" AND user_id IS NULL         │
│                                                             │
│  4. 后续所有行为都关联到 user_id = 42                        │
│     └─ 数据持久化，跨设备可查                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 API 保护分级

| 级别 | 依赖 | 适用 API | 说明 |
|------|------|---------|------|
| 公开 | 无 | `/api/spots`, `/api/routes`, `/api/auth/*` | 任何人可访问 |
| 可选 | `get_current_user_optional` | `/api/chat`, `/api/guide` | 登录用户有个性化体验 |
| 必须 | `get_current_user` | `/api/memory`, `/api/auth/me`, `/api/auth/profile` | 必须登录 |

---

## 8. 场景示例

### 场景 1：首次使用（游客模式）

```
[用户打开 App]
    │
    ▼
[显示登录页]
    │
    ├─ 点击"先逛逛" → 进入首页（匿名模式）
    │                    │
    │                    ▼
    │              [VRM 欢迎，开始导览]
    │                    │
    │                    ▼
    │              [打卡景点 → 数据存 session]
    │                    │
    │                    ▼
    │              [关闭 App → 数据丢失]
    │
    └─ 输入账号密码 → 登录成功
                         │
                         ▼
                   [进入首页（登录模式）]
                         │
                         ▼
                   [打卡景点 → 数据持久化]
                         │
                         ▼
                   [下次打开 → 自动登录 → 恢复数据]
```

### 场景 2：游客中途登录

```
[匿名用户已打卡 2 个景点]
    │
    ▼
[点击"我的" → 提示登录]
    │
    ▼
[登录成功]
    │
    ▼
[后端合并 session 数据到用户账号]
    │
    ▼
[显示"已为您同步 2 个打卡记录"]
    │
    ▼
[继续游览 → 数据持久化]
```

### 场景 3：Token 过期

```
[用户正在浏览]
    │
    ▼
[请求 API → 返回 401]
    │
    ▼
[Axios 拦截器清除 token，触发 authEvents]
    │
    ▼
[_layout 监听到事件 → 跳转登录页]
    │
    ▼
[显示提示："登录已过期，请重新登录"]
    │
    ▼
[用户重新登录 → 回到之前页面]
```

### 场景 4：多设备登录

```
[用户在手机 A 登录 → 打卡景点 A、B]
    │
[用户在手机 B 登录同一账号]
    │
    ▼
[获取用户信息 → 显示已打卡 2 个景点]
    │
    ▼
[继续打卡景点 C]
    │
    ▼
[回到手机 A → 刷新 → 显示已打卡 3 个景点]
```

---

## 9. 安全设计

### 9.1 密码安全

```
用户输入密码 "hello123"
    │
    ▼
bcrypt 哈希（salt rounds = 12）
    │
    ▼
存储: "$2b$12$KIXx...随机盐...哈希值"
    │
    ▼
验证时: bcrypt.verify(输入, 存储值)
```

- 不存明文密码
- bcrypt 自带盐值，防彩虹表
- 12 轮迭代，防暴力破解

### 9.2 Token 安全

```
Token 内容:
{
  "sub": "42",           // 用户 ID
  "username": "zhangsan", // 用户名
  "exp": 1719000000      // 过期时间（7 天）
}
    │
    ▼
HS256 签名（密钥存服务端 .env）
    │
    ▼
前端存 AsyncStorage（不存 Cookie）
    │
    ▼
每次请求自动携带 Authorization: Bearer <token>
```

### 9.3 防护措施

| 风险 | 防护 |
|------|------|
| 密码泄露 | bcrypt 哈希，不存明文 |
| Token 窃取 | HTTPS 传输，HttpOnly 不适用（移动端用 AsyncStorage） |
| 暴力登录 | 后续可加 rate limiting |
| SQL 注入 | SQLAlchemy 参数化查询 |
| XSS | React Native 天然防 XSS |

---

## 10. 实施顺序

| 步骤 | 内容 | 验证 |
|---|---|---|
| 1 | 后端：User 模型 + security.py + deps.py | 数据库建表成功 |
| 2 | 后端：auth API（注册/登录/Me/修改资料/改密码） | curl 测试接口通 |
| 3 | 后端：TouristProfile 添加 user_id 外键 | 迁移脚本执行成功 |
| 4 | 前端：auth API 封装 + useAuth hook | 能调用接口 |
| 5 | 前端：登录/注册页面 | 页面能渲染、表单能提交 |
| 6 | 前端：个人中心页面 | 显示用户信息、可退出 |
| 7 | 前端：路由守卫 + 401 拦截 | 未登录跳转登录页 |
| 8 | 后端：登录时合并匿名 session 数据 | 合并逻辑正确 |
| 9 | 逐步给现有 API 加认证依赖 | 受保护接口返回 401 |

---

## 11. 不需要做的

- 不引入 OAuth/微信登录（当前不需要）
- 不做邮箱验证（用户名+密码即可）
- 不做角色权限细分（只有 tourist/admin 两档）
- 不做双因素认证（2FA）
- 不改动现有 TouristProfile 的核心字段（仅添加 user_id 外键）

---

## 12. 后续扩展

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 微信登录 | 小程序场景下的 OAuth 登录 | 低 |
| 手机号登录 | 短信验证码登录 | 低 |
| 管理员后台 | admin 角色管理景点/路线/用户 | 中 |
| 登录限流 | 防止暴力破解 | 中 |
| 设备管理 | 查看/移除已登录设备 | 低 |
| 数据导出 | 用户导出自己的旅行数据 | 低 |
