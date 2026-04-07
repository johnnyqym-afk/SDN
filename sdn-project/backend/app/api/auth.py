"""
API Router: Authentication
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.models.models import User, UserRole, Role
from app.schemas.schemas import LoginRequest, TokenResponse, RefreshRequest, ApiResponse
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=ApiResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == req.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.password_hash or ""):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    if user.status == "LOCKED":
        raise HTTPException(status_code=403, detail="账户已锁定，请联系管理员")

    if user.status == "DISABLED":
        raise HTTPException(status_code=403, detail="账户已禁用")

    # Get roles
    role_result = await db.execute(
        select(Role.role_code)
        .join(UserRole, Role.id == UserRole.role_id)
        .where(UserRole.user_id == user.id)
    )
    roles = [r[0] for r in role_result.fetchall()]

    token_data = {"sub": user.id, "username": user.username, "roles": roles}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"sub": user.id})

    # Update last_login
    user.last_login = datetime.now(timezone.utc)
    await db.commit()

    return ApiResponse(data=TokenResponse(
        access_token=access_token,
        expires_in=3600,
        refresh_token=refresh_token,
        tenant_id=user.tenant_id,
    ))


@router.post("/refresh-token", response_model=ApiResponse)
async def refresh_token(req: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    role_result = await db.execute(
        select(Role.role_code)
        .join(UserRole, Role.id == UserRole.role_id)
        .where(UserRole.user_id == user.id)
    )
    roles = [r[0] for r in role_result.fetchall()]

    access_token = create_access_token({"sub": user.id, "username": user.username, "roles": roles})
    return ApiResponse(data={"access_token": access_token, "expires_in": 3600})


@router.post("/logout", response_model=ApiResponse)
async def logout():
    # In production: add token to Redis blacklist
    return ApiResponse(message="Logged out successfully")
