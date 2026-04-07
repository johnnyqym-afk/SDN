"""
Pydantic v2 Request/Response Schemas
"""
from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field


# ─────────────────────────────────────────────────
# Common
# ─────────────────────────────────────────────────

class ApiResponse(BaseModel):
    code: str = "0"
    message: str = "Success"
    data: Any = None
    request_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[Any]


# ─────────────────────────────────────────────────
# Auth
# ─────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str
    mfa_code: Optional[str] = None
    tenant_id: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    refresh_token: str
    tenant_id: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


# ─────────────────────────────────────────────────
# Users
# ─────────────────────────────────────────────────

class UserOut(BaseModel):
    id: str
    username: str
    email: str
    status: str
    mfa_enabled: bool
    last_login: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    email: EmailStr
    password: str = Field(..., min_length=8)
    role_codes: List[str] = []


# ─────────────────────────────────────────────────
# Devices
# ─────────────────────────────────────────────────

class DeviceOut(BaseModel):
    id: str
    hostname: str
    mgmt_ip: str
    vendor: Optional[str]
    model: Optional[str]
    version: Optional[str]
    status: str
    managed: bool
    connection_type: str
    last_heartbeat: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class DeviceCreate(BaseModel):
    hostname: str
    mgmt_ip: str
    vendor: Optional[str] = None
    model: Optional[str] = None
    connection_type: str = "NETCONF"


# ─────────────────────────────────────────────────
# Service Orders
# ─────────────────────────────────────────────────

class OrderCreate(BaseModel):
    service_type: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    problem_description: Optional[str] = None
    requested_bandwidth_mbps: Optional[int] = None
    sla_target_percent: Optional[float] = None
    requested_completion_at: Optional[datetime] = None
    priority: int = Field(3, ge=1, le=5)


class OrderOut(BaseModel):
    id: str
    order_no: str
    service_type: str
    customer_name: Optional[str]
    status: str
    priority: int
    sla_target_percent: Optional[float]
    requested_completion_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────
# Service Instances
# ─────────────────────────────────────────────────

class ServiceOut(BaseModel):
    id: str
    service_code: str
    service_name: str
    service_type: str
    status: str
    sla_target_percent: Optional[float]
    current_sla_percent: Optional[float]
    customer_name: Optional[str]
    expire_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class L3VpnPlanRequest(BaseModel):
    order_id: Optional[str] = None
    service_name: str
    vrf_template_id: Optional[str] = None
    rd: Optional[str] = None
    import_rts: List[str] = []
    export_rts: List[str] = []
    sites: List[dict] = []
    route_policy_id: Optional[str] = None
    qos_template_id: Optional[str] = None
    enable_bfd: bool = False
    bfd_template_id: Optional[str] = None
    sla_target_percent: Optional[float] = 99.5


class VplsPlanRequest(BaseModel):
    order_id: Optional[str] = None
    service_name: str
    vsi_name: str
    vni: Optional[int] = None
    rd: Optional[str] = None
    import_rt: Optional[str] = None
    export_rt: Optional[str] = None
    sites: List[dict] = []
    tunnel_policy_id: Optional[str] = None
    mtu: int = 1500
    enable_nqa: bool = False
    nqa_template_id: Optional[str] = None


# ─────────────────────────────────────────────────
# Changes
# ─────────────────────────────────────────────────

class ChangeOut(BaseModel):
    id: str
    change_no: str
    service_id: Optional[str]
    change_type: str
    risk_level: str
    status: str
    scheduled_start: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class PrecheckResult(BaseModel):
    overall: str  # PASSED / WARNING / BLOCKED
    items: List[dict]


# ─────────────────────────────────────────────────
# Alarms
# ─────────────────────────────────────────────────

class AlarmOut(BaseModel):
    id: str
    severity: str
    source_name: Optional[str]
    description: str
    status: str
    aggregate_count: int
    first_occurred_at: datetime
    last_occurred_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────
# Dashboard
# ─────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    p1_alarm_count: int
    active_changes: int
    sla_rate_pct: float
    device_online_rate_pct: float
    service_count: int
    weekly_change_success_rate: float
