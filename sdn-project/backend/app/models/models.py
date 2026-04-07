"""
ORM Models for SDN Controller
Based on DataModel_Design.md
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Boolean, Integer, Float, Text, DateTime, ForeignKey,
    Numeric, UniqueConstraint, CheckConstraint, JSON, Index
)
from sqlalchemy.dialects.postgresql import UUID, INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.core.database import Base


def gen_uuid():
    return str(uuid.uuid4())


# ─────────────────────────────────────────────────
# IAM
# ─────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255))
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_password_change: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    tenant_id: Mapped[Optional[str]] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('ACTIVE','LOCKED','DISABLED')", name="user_status_check"),
    )


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    role_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    role_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    tenant_id: Mapped[Optional[str]] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserRole(Base):
    __tablename__ = "user_roles"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    tenant_id: Mapped[Optional[str]] = mapped_column(String(64))
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    assigned_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))

    __table_args__ = (
        UniqueConstraint("user_id", "role_id", "tenant_id", name="uq_user_roles"),
    )


# ─────────────────────────────────────────────────
# Inventory
# ─────────────────────────────────────────────────

class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    hostname: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    mgmt_ip: Mapped[str] = mapped_column(INET, unique=True, nullable=False)
    vendor: Mapped[Optional[str]] = mapped_column(String(64))
    model: Mapped[Optional[str]] = mapped_column(String(64))
    version: Mapped[Optional[str]] = mapped_column(String(64))
    serial_number: Mapped[Optional[str]] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="ONLINE")
    managed: Mapped[bool] = mapped_column(Boolean, default=False)
    connection_type: Mapped[str] = mapped_column(String(20), default="NETCONF")
    last_heartbeat: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    last_discovery: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    interfaces: Mapped[list["Interface"]] = relationship("Interface", back_populates="device", cascade="all, delete-orphan")


class Interface(Base):
    __tablename__ = "interfaces"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    device_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    if_name: Mapped[str] = mapped_column(String(64), nullable=False)
    if_type: Mapped[Optional[str]] = mapped_column(String(32))
    admin_state: Mapped[str] = mapped_column(String(20), default="UP")
    oper_state: Mapped[str] = mapped_column(String(20), default="UP")
    bandwidth_mbps: Mapped[Optional[int]] = mapped_column(Integer)
    mtu: Mapped[int] = mapped_column(Integer, default=1500)
    ip_address: Mapped[Optional[str]] = mapped_column(INET)
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    device: Mapped["Device"] = relationship("Device", back_populates="interfaces")

    __table_args__ = (
        UniqueConstraint("device_id", "if_name", name="uq_device_ifname"),
    )


class Link(Base):
    __tablename__ = "links"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    a_if_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("interfaces.id", ondelete="CASCADE"), nullable=False)
    z_if_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("interfaces.id", ondelete="CASCADE"), nullable=False)
    link_type: Mapped[Optional[str]] = mapped_column(String(32))
    layer: Mapped[int] = mapped_column(Integer, default=3)
    metric: Mapped[int] = mapped_column(Integer, default=1)
    capacity_mbps: Mapped[Optional[int]] = mapped_column(Integer)
    utilization_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    status: Mapped[str] = mapped_column(String(20), default="UP")
    last_update: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ConfigSnapshot(Base):
    __tablename__ = "config_snapshots"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    device_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False)
    snapshot_type: Mapped[Optional[str]] = mapped_column(String(20))
    content_uri: Mapped[Optional[str]] = mapped_column(String(1024))
    content_size_kb: Mapped[Optional[int]] = mapped_column(Integer)
    content_hash: Mapped[Optional[str]] = mapped_column(String(64))
    related_change_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))
    remarks: Mapped[Optional[str]] = mapped_column(Text)


# ─────────────────────────────────────────────────
# Resource Pools
# ─────────────────────────────────────────────────

class ResourcePool(Base):
    __tablename__ = "resource_pools"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    pool_type: Mapped[str] = mapped_column(String(32), nullable=False)
    pool_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    scope: Mapped[str] = mapped_column(String(32), default="GLOBAL")
    scope_id: Mapped[Optional[str]] = mapped_column(String(255))
    min_value: Mapped[Optional[int]] = mapped_column(Integer)
    max_value: Mapped[Optional[int]] = mapped_column(Integer)
    total_count: Mapped[Optional[int]] = mapped_column(Integer)
    allocated_count: Mapped[int] = mapped_column(Integer, default=0)
    utilization_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class PoolAllocation(Base):
    __tablename__ = "pool_allocations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    pool_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("resource_pools.id", ondelete="CASCADE"), nullable=False)
    resource_key: Mapped[Optional[str]] = mapped_column(String(255))
    service_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    allocated_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))
    allocated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[str] = mapped_column(String(20), default="ALLOCATED")
    expire_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    remarks: Mapped[Optional[str]] = mapped_column(Text)


# ─────────────────────────────────────────────────
# Services
# ─────────────────────────────────────────────────

class ServiceOrder(Base):
    __tablename__ = "service_orders"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    order_no: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    service_type: Mapped[str] = mapped_column(String(32), nullable=False)
    customer_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    customer_name: Mapped[Optional[str]] = mapped_column(String(255))
    problem_description: Mapped[Optional[str]] = mapped_column(Text)
    requested_bandwidth_mbps: Mapped[Optional[int]] = mapped_column(Integer)
    sla_target_percent: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    requested_completion_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    priority: Mapped[int] = mapped_column(Integer, default=3)
    status: Mapped[str] = mapped_column(String(32), default="DRAFT")
    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ServiceInstance(Base):
    __tablename__ = "service_instances"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    service_code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    service_name: Mapped[str] = mapped_column(String(255), nullable=False)
    service_type: Mapped[str] = mapped_column(String(32), nullable=False)
    order_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("service_orders.id"))
    customer_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    customer_name: Mapped[Optional[str]] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(32), default="DRAFT")
    sla_target_percent: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    current_sla_percent: Mapped[Optional[float]] = mapped_column(Numeric(5, 2))
    expire_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class L3VpnInstance(Base):
    __tablename__ = "l3vpn_instances"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    service_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("service_instances.id"), nullable=False)
    vrf_name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    rd: Mapped[Optional[str]] = mapped_column(String(64))
    import_rts: Mapped[Optional[list]] = mapped_column(JSON)
    export_rts: Mapped[Optional[list]] = mapped_column(JSON)
    route_policy_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    qos_template_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    bfd_template_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class VplsInstance(Base):
    __tablename__ = "vpls_instances"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    service_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("service_instances.id"), nullable=False)
    vsi_name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    vni: Mapped[Optional[int]] = mapped_column(Integer)
    rd: Mapped[Optional[str]] = mapped_column(String(64))
    import_rt: Mapped[Optional[str]] = mapped_column(String(64))
    export_rt: Mapped[Optional[str]] = mapped_column(String(64))
    tunnel_policy_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    mtu: Mapped[int] = mapped_column(Integer, default=1500)
    nqa_template_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ServiceEndpoint(Base):
    __tablename__ = "service_endpoints"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    service_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("service_instances.id"), nullable=False)
    site_name: Mapped[str] = mapped_column(String(255), nullable=False)
    device_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("devices.id"), nullable=False)
    interface_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("interfaces.id"), nullable=False)
    ac_vlan: Mapped[Optional[int]] = mapped_column(Integer)
    ac_ip: Mapped[Optional[str]] = mapped_column(INET)
    bandwidth_mbps: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────────
# Policies
# ─────────────────────────────────────────────────

class TunnelPolicy(Base):
    __tablename__ = "tunnel_policies"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    policy_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    src_device_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("devices.id"))
    dst_device_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("devices.id"))
    priority: Mapped[int] = mapped_column(Integer, default=5)
    primary_path_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    backup_path_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    protection_mode: Mapped[str] = mapped_column(String(20), default="Unprotected")
    wtr_seconds: Mapped[int] = mapped_column(Integer, default=300)
    reserved_bw_mbps: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="active")
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ExplicitPath(Base):
    __tablename__ = "explicit_paths"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    path_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    src_device_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("devices.id"))
    dst_device_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("devices.id"))
    hops: Mapped[Optional[list]] = mapped_column(JSON)
    total_cost: Mapped[Optional[int]] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class QosProfile(Base):
    __tablename__ = "qos_profiles"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    template_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    cir_mbps: Mapped[Optional[int]] = mapped_column(Integer)
    pir_mbps: Mapped[Optional[int]] = mapped_column(Integer)
    cbs_bytes: Mapped[Optional[int]] = mapped_column(Integer)
    pbs_bytes: Mapped[Optional[int]] = mapped_column(Integer)
    priority_class: Mapped[Optional[str]] = mapped_column(String(10))
    queue_config: Mapped[Optional[dict]] = mapped_column(JSONB)
    version: Mapped[str] = mapped_column(String(20), default="v1.0")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SlaProfile(Base):
    __tablename__ = "sla_profiles"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    template_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    availability_target: Mapped[Optional[float]] = mapped_column(Numeric(5, 3))
    latency_target_ms: Mapped[Optional[int]] = mapped_column(Integer)
    jitter_target_ms: Mapped[Optional[int]] = mapped_column(Integer)
    loss_rate_target: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))
    bfd_tx_ms: Mapped[int] = mapped_column(Integer, default=100)
    bfd_rx_ms: Mapped[int] = mapped_column(Integer, default=100)
    bfd_mult: Mapped[int] = mapped_column(Integer, default=3)
    nqa_freq_sec: Mapped[int] = mapped_column(Integer, default=60)
    alert_rules: Mapped[Optional[list]] = mapped_column(JSON)
    version: Mapped[str] = mapped_column(String(20), default="v1.0")
    status: Mapped[str] = mapped_column(String(20), default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────────
# Changes
# ─────────────────────────────────────────────────

class ChangeRequest(Base):
    __tablename__ = "change_requests"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    change_no: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    service_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("service_instances.id"))
    change_type: Mapped[str] = mapped_column(String(32), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(10), default="medium")
    status: Mapped[str] = mapped_column(String(32), default="CREATED")
    candidate_config: Mapped[Optional[dict]] = mapped_column(JSONB)
    pre_check_result: Mapped[Optional[dict]] = mapped_column(JSONB)
    impact_assessment: Mapped[Optional[dict]] = mapped_column(JSONB)
    scheduled_start: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    scheduled_end: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    batch_strategy: Mapped[Optional[dict]] = mapped_column(JSONB)
    requester_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ChangeApproval(Base):
    __tablename__ = "change_approvals"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    change_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("change_requests.id", ondelete="CASCADE"), nullable=False)
    approver_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    remarks: Mapped[Optional[str]] = mapped_column(Text)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class DeployJob(Base):
    __tablename__ = "deploy_jobs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    change_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("change_requests.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING")
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    deployed_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))
    log_uri: Mapped[Optional[str]] = mapped_column(String(1024))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class DeployTask(Base):
    __tablename__ = "deploy_tasks"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    job_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("deploy_jobs.id", ondelete="CASCADE"), nullable=False)
    device_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("devices.id"), nullable=False)
    batch_no: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(20), default="PENDING")
    commands: Mapped[Optional[list]] = mapped_column(JSON)
    log_text: Mapped[Optional[str]] = mapped_column(Text)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class RollbackJob(Base):
    __tablename__ = "rollback_jobs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    change_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("change_requests.id"), nullable=False)
    rollback_type: Mapped[str] = mapped_column(String(20), default="AUTO")
    status: Mapped[str] = mapped_column(String(32), default="PENDING")
    initiated_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    log_text: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────────
# Operations
# ─────────────────────────────────────────────────

class Alarm(Base):
    __tablename__ = "alarms"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    alarm_code: Mapped[Optional[str]] = mapped_column(String(64))
    severity: Mapped[str] = mapped_column(String(5), default="P3")
    source_type: Mapped[Optional[str]] = mapped_column(String(20))
    source_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    source_name: Mapped[Optional[str]] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text, nullable=False)
    related_service_ids: Mapped[Optional[list]] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(20), default="NEW")
    aggregate_count: Mapped[int] = mapped_column(Integer, default=1)
    first_occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    acknowledged_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    ai_suggestion: Mapped[Optional[str]] = mapped_column(Text)


class SlaResult(Base):
    __tablename__ = "sla_results_daily"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    service_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("service_instances.id"), nullable=False)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    availability_pct: Mapped[Optional[float]] = mapped_column(Numeric(7, 4))
    latency_p95_ms: Mapped[Optional[int]] = mapped_column(Integer)
    jitter_p95_ms: Mapped[Optional[int]] = mapped_column(Integer)
    loss_rate_pct: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))
    violation_minutes: Mapped[int] = mapped_column(Integer, default=0)
    target_met: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (
        UniqueConstraint("service_id", "date", name="uq_sla_service_date"),
    )


# ─────────────────────────────────────────────────
# Audit
# ─────────────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    actor_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"))
    actor_name: Mapped[Optional[str]] = mapped_column(String(255))
    action_type: Mapped[str] = mapped_column(String(32), nullable=False)
    object_type: Mapped[str] = mapped_column(String(64), nullable=False)
    object_id: Mapped[Optional[str]] = mapped_column(String(255))
    detail: Mapped[Optional[str]] = mapped_column(Text)
    result: Mapped[str] = mapped_column(String(20), default="SUCCESS")
    source_ip: Mapped[Optional[str]] = mapped_column(INET)
    prev_hash: Mapped[Optional[str]] = mapped_column(String(64))
    curr_hash: Mapped[Optional[str]] = mapped_column(String(64))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
