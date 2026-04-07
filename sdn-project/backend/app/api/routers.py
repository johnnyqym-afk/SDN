"""
API Routers: Dashboard, Devices, Alarms, Orders, Services, Changes
"""
from fastapi import APIRouter, Depends, Query, HTTPException, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import (
    Device, Interface, Link, ServiceOrder, ServiceInstance,
    ChangeRequest, Alarm, SlaResult, DeployJob, ResourcePool
)
from app.schemas.schemas import (
    ApiResponse, DeviceOut, DeviceCreate, OrderOut, OrderCreate,
    ServiceOut, ChangeOut, AlarmOut, DashboardSummary,
    L3VpnPlanRequest, VplsPlanRequest, PaginatedResponse
)
import uuid
from datetime import datetime, timezone, timedelta

# ─────────────────────────────────────────────────
# Dashboard
# ─────────────────────────────────────────────────

dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@dashboard_router.get("/summary", response_model=ApiResponse)
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    p1_count = await db.scalar(
        select(func.count()).select_from(Alarm).where(
            and_(Alarm.severity == "P1", Alarm.status == "NEW")
        )
    ) or 0

    active_changes = await db.scalar(
        select(func.count()).select_from(ChangeRequest).where(
            ChangeRequest.status.in_(["APPROVING", "APPROVED", "RUNNING", "SCHEDULED"])
        )
    ) or 0

    service_count = await db.scalar(
        select(func.count()).select_from(ServiceInstance)
    ) or 0

    total_devices = await db.scalar(select(func.count()).select_from(Device)) or 1
    online_devices = await db.scalar(
        select(func.count()).select_from(Device).where(Device.status == "ONLINE")
    ) or 0

    return ApiResponse(data=DashboardSummary(
        p1_alarm_count=p1_count,
        active_changes=active_changes,
        sla_rate_pct=99.2,
        device_online_rate_pct=round(online_devices / total_devices * 100, 1),
        service_count=service_count,
        weekly_change_success_rate=96.7,
    ))


# ─────────────────────────────────────────────────
# Devices
# ─────────────────────────────────────────────────

devices_router = APIRouter(prefix="/inventory", tags=["inventory"])


@devices_router.get("/devices", response_model=ApiResponse)
async def list_devices(
    status: Optional[str] = None,
    managed: Optional[bool] = None,
    keyword: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    q = select(Device)
    if status:
        q = q.where(Device.status == status)
    if managed is not None:
        q = q.where(Device.managed == managed)
    if keyword:
        q = q.where(Device.hostname.ilike(f"%{keyword}%"))

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset((page - 1) * page_size).limit(page_size))
    devices = result.scalars().all()

    return ApiResponse(data=PaginatedResponse(
        total=total or 0,
        page=page,
        page_size=page_size,
        items=[DeviceOut.model_validate(d) for d in devices],
    ))


@devices_router.get("/devices/{device_id}", response_model=ApiResponse)
async def get_device(
    device_id: str = Path(...),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return ApiResponse(data=DeviceOut.model_validate(device))


@devices_router.post("/devices", response_model=ApiResponse, status_code=201)
async def create_device(
    req: DeviceCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    device = Device(
        id=str(uuid.uuid4()),
        hostname=req.hostname,
        mgmt_ip=req.mgmt_ip,
        vendor=req.vendor,
        model=req.model,
        connection_type=req.connection_type,
    )
    db.add(device)
    await db.commit()
    return ApiResponse(data=DeviceOut.model_validate(device))


@devices_router.get("/interfaces", response_model=ApiResponse)
async def list_interfaces(
    device_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    q = select(Interface)
    if device_id:
        q = q.where(Interface.device_id == device_id)
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset((page - 1) * page_size).limit(page_size))
    interfaces = result.scalars().all()
    return ApiResponse(data=PaginatedResponse(
        total=total or 0, page=page, page_size=page_size,
        items=[{"id": i.id, "device_id": i.device_id, "if_name": i.if_name,
                "oper_state": i.oper_state, "bandwidth_mbps": i.bandwidth_mbps} for i in interfaces],
    ))


@devices_router.get("/links", response_model=ApiResponse)
async def get_topology(
    layer: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    q = select(Link)
    if layer:
        q = q.where(Link.layer == layer)
    result = await db.execute(q)
    links = result.scalars().all()
    return ApiResponse(data=[{
        "id": l.id, "a_if_id": l.a_if_id, "z_if_id": l.z_if_id,
        "status": l.status, "utilization_pct": float(l.utilization_pct or 0),
    } for l in links])


# ─────────────────────────────────────────────────
# Alarms
# ─────────────────────────────────────────────────

alarms_router = APIRouter(prefix="/alarms", tags=["alarms"])


@alarms_router.get("", response_model=ApiResponse)
async def list_alarms(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    q = select(Alarm)
    if severity:
        q = q.where(Alarm.severity == severity)
    if status:
        q = q.where(Alarm.status == status)
    q = q.order_by(Alarm.first_occurred_at.desc())

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset((page - 1) * page_size).limit(page_size))
    alarms = result.scalars().all()

    return ApiResponse(data=PaginatedResponse(
        total=total or 0, page=page, page_size=page_size,
        items=[AlarmOut.model_validate(a) for a in alarms],
    ))


@alarms_router.get("/{alarm_id}", response_model=ApiResponse)
async def get_alarm(alarm_id: str, db: AsyncSession = Depends(get_db), _: str = Depends(get_current_user_id)):
    result = await db.execute(select(Alarm).where(Alarm.id == alarm_id))
    alarm = result.scalar_one_or_none()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    return ApiResponse(data=AlarmOut.model_validate(alarm))


@alarms_router.put("/{alarm_id}/acknowledge", response_model=ApiResponse)
async def acknowledge_alarm(
    alarm_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Alarm).where(Alarm.id == alarm_id))
    alarm = result.scalar_one_or_none()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    alarm.status = "ACKNOWLEDGED"
    alarm.acknowledged_by = user_id
    alarm.acknowledged_at = datetime.now(timezone.utc)
    await db.commit()
    return ApiResponse(message="Alarm acknowledged")


@alarms_router.put("/{alarm_id}/close", response_model=ApiResponse)
async def close_alarm(
    alarm_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(Alarm).where(Alarm.id == alarm_id))
    alarm = result.scalar_one_or_none()
    if not alarm:
        raise HTTPException(status_code=404, detail="Alarm not found")
    alarm.status = "CLOSED"
    alarm.closed_at = datetime.now(timezone.utc)
    await db.commit()
    return ApiResponse(message="Alarm closed")


# ─────────────────────────────────────────────────
# Orders
# ─────────────────────────────────────────────────

orders_router = APIRouter(prefix="/orders", tags=["orders"])


def _gen_order_no():
    now = datetime.now(timezone.utc)
    return f"ORD-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"


@orders_router.get("", response_model=ApiResponse)
async def list_orders(
    service_type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    q = select(ServiceOrder).order_by(ServiceOrder.created_at.desc())
    if service_type:
        q = q.where(ServiceOrder.service_type == service_type)
    if status:
        q = q.where(ServiceOrder.status == status)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset((page - 1) * page_size).limit(page_size))
    orders = result.scalars().all()

    return ApiResponse(data=PaginatedResponse(
        total=total or 0, page=page, page_size=page_size,
        items=[OrderOut.model_validate(o) for o in orders],
    ))


@orders_router.post("", response_model=ApiResponse, status_code=201)
async def create_order(
    req: OrderCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    order = ServiceOrder(
        id=str(uuid.uuid4()),
        order_no=_gen_order_no(),
        service_type=req.service_type,
        customer_name=req.customer_name,
        problem_description=req.problem_description,
        requested_bandwidth_mbps=req.requested_bandwidth_mbps,
        sla_target_percent=req.sla_target_percent,
        requested_completion_at=req.requested_completion_at,
        priority=req.priority,
        status="DRAFT",
        created_by=user_id,
    )
    db.add(order)
    await db.commit()
    return ApiResponse(data={"id": order.id, "order_no": order.order_no, "status": order.status})


@orders_router.get("/{order_id}", response_model=ApiResponse)
async def get_order(order_id: str, db: AsyncSession = Depends(get_db), _: str = Depends(get_current_user_id)):
    result = await db.execute(select(ServiceOrder).where(ServiceOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return ApiResponse(data=OrderOut.model_validate(order))


@orders_router.post("/{order_id}/submit", response_model=ApiResponse)
async def submit_order(order_id: str, db: AsyncSession = Depends(get_db), _: str = Depends(get_current_user_id)):
    result = await db.execute(select(ServiceOrder).where(ServiceOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "DRAFT":
        raise HTTPException(status_code=400, detail=f"Cannot submit order in status {order.status}")
    order.status = "SUBMITTED"
    await db.commit()
    return ApiResponse(data={"order_no": order.order_no, "status": "SUBMITTED"})


@orders_router.post("/{order_id}/approve", response_model=ApiResponse)
async def approve_order(order_id: str, db: AsyncSession = Depends(get_db), _: str = Depends(get_current_user_id)):
    result = await db.execute(select(ServiceOrder).where(ServiceOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = "APPROVED"
    await db.commit()
    return ApiResponse(data={"order_no": order.order_no, "status": "APPROVED"})


# ─────────────────────────────────────────────────
# Services
# ─────────────────────────────────────────────────

services_router = APIRouter(prefix="/services", tags=["services"])


def _gen_service_code(svc_type: str):
    now = datetime.now(timezone.utc)
    prefix = "L3" if svc_type == "L3VPN" else "VL" if svc_type == "VPLS" else "SVC"
    return f"SVC-{prefix}-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"


@services_router.get("", response_model=ApiResponse)
async def list_services(
    service_type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    q = select(ServiceInstance).order_by(ServiceInstance.created_at.desc())
    if service_type:
        q = q.where(ServiceInstance.service_type == service_type)
    if status:
        q = q.where(ServiceInstance.status == status)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset((page - 1) * page_size).limit(page_size))
    services = result.scalars().all()

    return ApiResponse(data=PaginatedResponse(
        total=total or 0, page=page, page_size=page_size,
        items=[ServiceOut.model_validate(s) for s in services],
    ))


@services_router.get("/{service_id}", response_model=ApiResponse)
async def get_service(service_id: str, db: AsyncSession = Depends(get_db), _: str = Depends(get_current_user_id)):
    result = await db.execute(select(ServiceInstance).where(ServiceInstance.id == service_id))
    svc = result.scalar_one_or_none()
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    return ApiResponse(data=ServiceOut.model_validate(svc))


@services_router.post("/l3vpn/plan", response_model=ApiResponse, status_code=201)
async def plan_l3vpn(
    req: L3VpnPlanRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    from app.models.models import L3VpnInstance
    service = ServiceInstance(
        id=str(uuid.uuid4()),
        service_code=_gen_service_code("L3VPN"),
        service_name=req.service_name,
        service_type="L3VPN",
        order_id=req.order_id,
        status="DRAFT",
        sla_target_percent=req.sla_target_percent,
        created_by=user_id,
    )
    db.add(service)
    await db.flush()

    l3vpn = L3VpnInstance(
        id=str(uuid.uuid4()),
        service_id=service.id,
        vrf_name=f"vrf_{req.service_name.lower().replace('-', '_')[:20]}",
        rd=req.rd,
        import_rts=req.import_rts,
        export_rts=req.export_rts,
        qos_template_id=req.qos_template_id,
    )
    db.add(l3vpn)
    await db.commit()

    return ApiResponse(data={
        "service_id": service.id,
        "service_code": service.service_code,
        "vrf_name": l3vpn.vrf_name,
        "status": "DRAFT",
    })


@services_router.post("/vpls/plan", response_model=ApiResponse, status_code=201)
async def plan_vpls(
    req: VplsPlanRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    from app.models.models import VplsInstance
    service = ServiceInstance(
        id=str(uuid.uuid4()),
        service_code=_gen_service_code("VPLS"),
        service_name=req.service_name,
        service_type="VPLS",
        order_id=req.order_id,
        status="DRAFT",
        created_by=user_id,
    )
    db.add(service)
    await db.flush()

    vpls = VplsInstance(
        id=str(uuid.uuid4()),
        service_id=service.id,
        vsi_name=req.vsi_name,
        vni=req.vni,
        rd=req.rd,
        import_rt=req.import_rt,
        export_rt=req.export_rt,
        mtu=req.mtu,
    )
    db.add(vpls)
    await db.commit()

    return ApiResponse(data={
        "service_id": service.id,
        "service_code": service.service_code,
        "vsi_name": vpls.vsi_name,
        "status": "DRAFT",
    })


# ─────────────────────────────────────────────────
# Changes
# ─────────────────────────────────────────────────

changes_router = APIRouter(prefix="/changes", tags=["changes"])


def _gen_change_no():
    now = datetime.now(timezone.utc)
    return f"CHG-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"


@changes_router.get("", response_model=ApiResponse)
async def list_changes(
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    q = select(ChangeRequest).order_by(ChangeRequest.created_at.desc())
    if status:
        q = q.where(ChangeRequest.status == status)
    if risk_level:
        q = q.where(ChangeRequest.risk_level == risk_level)

    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset((page - 1) * page_size).limit(page_size))
    changes = result.scalars().all()

    return ApiResponse(data=PaginatedResponse(
        total=total or 0, page=page, page_size=page_size,
        items=[ChangeOut.model_validate(c) for c in changes],
    ))


@changes_router.get("/{change_id}", response_model=ApiResponse)
async def get_change(change_id: str, db: AsyncSession = Depends(get_db), _: str = Depends(get_current_user_id)):
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.id == change_id))
    change = result.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    return ApiResponse(data=ChangeOut.model_validate(change))


@changes_router.post("/{change_id}/precheck", response_model=ApiResponse)
async def run_precheck(change_id: str, db: AsyncSession = Depends(get_db), _: str = Depends(get_current_user_id)):
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.id == change_id))
    change = result.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")

    # Simulated precheck result
    precheck = {
        "overall": "WARNING",
        "items": [
            {"name": "命令语法检查", "status": "PASSED", "detail": "40条命令语法正确", "severity": "BLOCKING"},
            {"name": "资源冲突检查", "status": "PASSED", "detail": "无VLAN/RD/RT冲突", "severity": "BLOCKING"},
            {"name": "拓扑可达性检查", "status": "PASSED", "detail": "所有目标设备在线", "severity": "BLOCKING"},
            {"name": "环路检测", "status": "PASSED", "detail": "无路径环路", "severity": "BLOCKING"},
            {"name": "VRF/VSI一致性", "status": "WARNING", "detail": "QoS模板版本不一致", "severity": "WARNING"},
            {"name": "BGP配置检查", "status": "PASSED", "detail": "BGP配置完整", "severity": "WARNING"},
            {"name": "回滚点检查", "status": "PASSED", "detail": "所有设备有有效快照", "severity": "BLOCKING"},
            {"name": "发布窗口检查", "status": "PASSED", "detail": "在发布窗口内", "severity": "WARNING"},
        ]
    }
    change.pre_check_result = precheck
    change.status = "PRECHECK_PASSED"
    await db.commit()
    return ApiResponse(data=precheck)


@changes_router.post("/{change_id}/submit", response_model=ApiResponse)
async def submit_change(change_id: str, db: AsyncSession = Depends(get_db), _: str = Depends(get_current_user_id)):
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.id == change_id))
    change = result.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    change.status = "APPROVING"
    await db.commit()
    return ApiResponse(data={"change_no": change.change_no, "status": "APPROVING"})


@changes_router.post("/{change_id}/approve", response_model=ApiResponse)
async def approve_change(change_id: str, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.id == change_id))
    change = result.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    change.status = "APPROVED"
    await db.commit()
    return ApiResponse(data={"change_no": change.change_no, "status": "APPROVED"})


# ─────────────────────────────────────────────────
# Deployments / Rollbacks
# ─────────────────────────────────────────────────

deployments_router = APIRouter(prefix="/deployments", tags=["deployments"])


@deployments_router.post("", response_model=ApiResponse, status_code=201)
async def start_deployment(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    change_id = body.get("change_id")
    result = await db.execute(select(ChangeRequest).where(ChangeRequest.id == change_id))
    change = result.scalar_one_or_none()
    if not change:
        raise HTTPException(status_code=404, detail="Change not found")
    if change.status != "APPROVED":
        raise HTTPException(status_code=400, detail="Change must be APPROVED before deployment")

    job = DeployJob(
        id=str(uuid.uuid4()),
        change_id=change_id,
        status="RUNNING",
        started_at=datetime.now(timezone.utc),
        deployed_by=user_id,
    )
    db.add(job)
    change.status = "RUNNING"
    await db.commit()

    return ApiResponse(data={"job_id": job.id, "status": "RUNNING"})


@deployments_router.post("/rollbacks", response_model=ApiResponse, status_code=201)
async def start_rollback(
    body: dict,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    from app.models.models import RollbackJob
    change_id = body.get("change_id")
    rollback_type = body.get("rollback_type", "MANUAL")

    job = RollbackJob(
        id=str(uuid.uuid4()),
        change_id=change_id,
        rollback_type=rollback_type,
        status="RUNNING",
        initiated_by=user_id,
        started_at=datetime.now(timezone.utc),
    )
    db.add(job)
    await db.commit()
    return ApiResponse(data={"rollback_job_id": job.id, "status": "RUNNING"})


# ─────────────────────────────────────────────────
# SLA
# ─────────────────────────────────────────────────

sla_router = APIRouter(prefix="/sla", tags=["sla"])


@sla_router.get("/dashboard", response_model=ApiResponse)
async def get_sla_dashboard(db: AsyncSession = Depends(get_db), _: str = Depends(get_current_user_id)):
    return ApiResponse(data={
        "overall_sla_pct": 99.2,
        "violation_count": 2,
        "violation_minutes": 148,
        "services_above_99pct": 61,
        "total_services": 68,
    })


@sla_router.get("/violations", response_model=ApiResponse)
async def get_sla_violations(db: AsyncSession = Depends(get_db), _: str = Depends(get_current_user_id)):
    return ApiResponse(data=[
        {"service_code": "SVC-L3-008", "period": "04-05 13:42~14:20", "actual_pct": 95.2, "target_pct": 99.9, "violation_minutes": 38, "root_cause": "PE3-SH接口故障"},
        {"service_code": "SVC-VL-003", "period": "04-03 02:00~03:50", "actual_pct": 97.1, "target_pct": 99.5, "violation_minutes": 110, "root_cause": "变更回滚操作"},
    ])


# ─────────────────────────────────────────────────
# Audit
# ─────────────────────────────────────────────────

audit_router = APIRouter(prefix="/audit", tags=["audit"])


@audit_router.get("/logs", response_model=ApiResponse)
async def list_audit_logs(
    action_type: Optional[str] = None,
    object_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(get_current_user_id),
):
    from app.models.models import AuditLog
    q = select(AuditLog).order_by(AuditLog.occurred_at.desc())
    if action_type:
        q = q.where(AuditLog.action_type == action_type)
    if object_type:
        q = q.where(AuditLog.object_type == object_type)
    total = await db.scalar(select(func.count()).select_from(q.subquery()))
    result = await db.execute(q.offset((page - 1) * page_size).limit(page_size))
    logs = result.scalars().all()
    return ApiResponse(data=PaginatedResponse(
        total=total or 0, page=page, page_size=page_size,
        items=[{
            "id": l.id, "actor_name": l.actor_name, "action_type": l.action_type,
            "object_type": l.object_type, "object_id": l.object_id,
            "detail": l.detail, "result": l.result, "occurred_at": l.occurred_at,
        } for l in logs],
    ))


# ─────────────────────────────────────────────────
# Pools
# ─────────────────────────────────────────────────

pools_router = APIRouter(prefix="/pools", tags=["pools"])


@pools_router.get("/interfaces", response_model=ApiResponse)
async def get_interface_pool(db: AsyncSession = Depends(get_db), _: str = Depends(get_current_user_id)):
    result = await db.execute(
        select(ResourcePool).where(ResourcePool.pool_type == "PORT")
    )
    pools = result.scalars().all()
    return ApiResponse(data=[{
        "id": p.id, "pool_name": p.pool_name, "total_count": p.total_count,
        "allocated_count": p.allocated_count, "utilization_pct": float(p.utilization_pct or 0),
    } for p in pools])


@pools_router.get("/ipam", response_model=ApiResponse)
async def get_ip_pool(db: AsyncSession = Depends(get_db), _: str = Depends(get_current_user_id)):
    result = await db.execute(
        select(ResourcePool).where(ResourcePool.pool_type.in_(["IP_LOOPBACK", "IP_PEER", "IP_BUSINESS", "PE_CE"]))
    )
    pools = result.scalars().all()
    return ApiResponse(data=[{
        "id": p.id, "pool_name": p.pool_name, "pool_type": p.pool_type,
        "total_count": p.total_count, "allocated_count": p.allocated_count,
        "utilization_pct": float(p.utilization_pct or 0),
    } for p in pools])


@pools_router.get("/labels", response_model=ApiResponse)
async def get_label_pool(db: AsyncSession = Depends(get_db), _: str = Depends(get_current_user_id)):
    result = await db.execute(
        select(ResourcePool).where(ResourcePool.pool_type.in_(["VLAN", "VNI", "RD", "RT"]))
    )
    pools = result.scalars().all()
    return ApiResponse(data=[{
        "id": p.id, "pool_name": p.pool_name, "pool_type": p.pool_type,
        "min_value": p.min_value, "max_value": p.max_value,
        "total_count": p.total_count, "allocated_count": p.allocated_count,
        "utilization_pct": float(p.utilization_pct or 0),
    } for p in pools])
