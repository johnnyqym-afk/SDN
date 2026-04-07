"""
SDN Controller Backend - FastAPI Application
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import uuid

from app.api.auth import router as auth_router
from app.api.routers import (
    dashboard_router, devices_router, alarms_router,
    orders_router, services_router, changes_router,
    deployments_router, sla_router, audit_router, pools_router,
)
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="SDN Controller API",
    description="SDN控制器北向REST API — L3VPN/VPLS/TE编排与运维平台",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request ID Middleware ───
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    start = time.time()
    response = await call_next(request)
    process_time = (time.time() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.2f}ms"
    return response


# ─── Exception Handlers ───
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"code": "5000", "message": str(exc), "data": None},
    )


# ─── Routers ───
app.include_router(auth_router)

v1 = "/api/v1"
app.include_router(dashboard_router, prefix=v1)
app.include_router(devices_router, prefix=v1)
app.include_router(alarms_router, prefix=v1)
app.include_router(orders_router, prefix=v1)
app.include_router(services_router, prefix=v1)
app.include_router(changes_router, prefix=v1)
app.include_router(deployments_router, prefix=v1)
app.include_router(sla_router, prefix=v1)
app.include_router(audit_router, prefix=v1)
app.include_router(pools_router, prefix=v1)


# ─── Health Check ───
@app.get("/health")
async def health():
    return {"status": "ok", "service": "sdn-controller-api", "version": "1.0.0"}


@app.get("/")
async def root():
    return {"message": "SDN Controller API v1.0 — see /docs for API documentation"}
