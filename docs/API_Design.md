# SDN 控制器 - API 接口规范 (OpenAPI 3.0)

## 1. 通用 API 设计规范

### 1.1 请求/响应格式

**所有请求 Header**:
```
Accept: application/json
Content-Type: application/json
Authorization: Bearer {jwt_token}
X-Request-ID: {uuid}  -- 用于追踪
X-Tenant-ID: {tenant_id}  -- 多租户支持
```

**标准响应格式**:
```json
{
  "code": "0",                    -- "0" 成功, 其他为错误码
  "message": "Success",           -- 错误描述(中英混合)
  "data": {...},                  -- 业务数据体
  "request_id": "{uuid}",         -- 用于追踪
  "timestamp": "2026-04-07T13:45:22Z"
}
```

### 1.2 错误码定义

| 错误码 | HTTP状态 | 含义 | 建议处理 |
|--------|---------|------|---------|
| 0 | 200 | 成功 | - |
| 1001 | 400 | 参数校验失败 | 检查请求参数 |
| 1002 | 401 | 未认证 | 重新登录 |
| 1003 | 403 | 无权限 | 申请权限 |
| 1004 | 404 | 资源不存在 | 检查ID |
| 1005 | 409 | 资源冲突 | 检查是否重复 |
| 2001 | 400 | 业务规则校验失败 | 按提示修改 |
| 2002 | 503 | 系统繁忙 | 稍后重试 |
| 5000 | 500 | 内部服务错误 | 联系管理员 |

---

## 2. 北向 REST API

### 2.1 认证与授权

#### POST /auth/login
**请求**:
```json
{
  "username": "alice",
  "password": "P@ssw0rd123",
  "mfa_code": "123456"  -- 可选
}
```

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "access_token": "eyJhbGc...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "refresh_token": "refresh_token...",
    "tenant_id": "default"
  }
}
```

---

#### POST /auth/refresh-token
**请求**:
```json
{
  "refresh_token": "refresh_token..."
}
```

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "access_token": "eyJhbGc...",
    "expires_in": 3600
  }
}
```

---

### 2.2 工单 API

#### POST /api/v1/orders
**创建工单**

**请求**:
```json
{
  "service_type": "L3VPN",
  "customer_id": "cust_001",
  "problem_description": "需要为分公司搭建L3VPN",
  "requested_bandwidth_mbps": 100,
  "sla_target_percent": 99.5,
  "requested_completion_at": "2026-04-21T00:00:00Z",
  "priority": 1
}
```

**响应** (201 Created):
```json
{
  "code": "0",
  "data": {
    "id": "order_uuid",
    "order_no": "ORD-20260407-001",
    "status": "DRAFT",
    "created_at": "2026-04-07T13:45:22Z"
  }
}
```

---

#### GET /api/v1/orders/{orderId}
**获取工单详情**

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "id": "order_uuid",
    "order_no": "ORD-20260407-001",
    "service_type": "L3VPN",
    "customer_id": "cust_001",
    "status": "DRAFT",
    "approval_flow": [
      {
        "approver": "approver_001",
        "role": "Approver",
        "status": "PENDING",
        "approval_at": null
      }
    ],
    "created_at": "2026-04-07T13:45:22Z"
  }
}
```

---

#### PUT /api/v1/orders/{orderId}
**修改工单(仅 DRAFT 状态可修改)**

**请求**:
```json
{
  "problem_description": "需要为分公司搭建L3VPN(已与客户确认)",
  "requested_bandwidth_mbps": 150
}
```

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "id": "order_uuid",
    "status": "DRAFT",
    "updated_at": "2026-04-07T14:00:00Z"
  }
}
```

---

#### POST /api/v1/orders/{orderId}/submit
**提交审批**

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "order_no": "ORD-20260407-001",
    "status": "SUBMITTED",
    "next_approver": "approver_001"
  }
}
```

---

### 2.3 L3VPN 编排 API

#### POST /api/v1/services/l3vpn/plan
**L3VPN 编排计划**

**请求**:
```json
{
  "order_id": "order_uuid",
  "service_name": "SVC-L3VPN-Customer-A",
  "vrf_template_id": "vrf_tpl_001",
  "sites": [
    {
      "site_name": "广州总部",
      "device_id": "device_pe1",
      "interface_id": "if_uuid",
      "ac_vlan": 2001,
      "ac_ip": "192.168.1.1/24"
    },
    {
      "site_name": "北京分公司",
      "device_id": "device_pe2",
      "interface_id": "if_uuid",
      "ac_vlan": 2002,
      "ac_ip": "192.168.2.1/24"
    }
  ],
  "route_policy_id": "route_pol_001",  -- 可选
  "qos_template_id": "qos_gold",       -- 可选
  "enable_bfd": true,
  "bfd_template_id": "bfd_tpl_001"     -- 可选
}
```

**响应** (201 Created):
```json
{
  "code": "0",
  "data": {
    "service_id": "service_uuid",
    "service_code": "SVC-L3VPN-001-20260407",
    "status": "DRAFT",
    "vrf_name": "cust_a_vrf",
    "rd": "65001:1001",
    "import_rts": ["65001:1001"],
    "export_rts": ["65001:1001"],
    "created_at": "2026-04-07T13:45:22Z"
  }
}
```

---

#### POST /api/v1/services/vpls/plan
**VPLS 编排计划**

**请求**:
```json
{
  "order_id": "order_uuid",
  "service_name": "SVC-VPLS-Customer-B",
  "vsi_template_id": "vsi_tpl_001",
  "vni": 5001,
  "sites": [
    {
      "site_name": "站点1",
      "device_id": "device_pe1",
      "interface_id": "if_uuid",
      "ac_vlan": 3001
    },
    {
      "site_name": "站点2",
      "device_id": "device_pe2",
      "interface_id": "if_uuid",
      "ac_vlan": 3002
    }
  ],
  "tunnel_policy_id": "tunnel_1:1",
  "mtu": 1500,
  "enable_nqa": true,
  "nqa_template_id": "nqa_tpl_001"
}
```

**响应** (201 Created):
```json
{
  "code": "0",
  "data": {
    "service_id": "service_uuid",
    "service_code": "SVC-VPLS-001-20260407",
    "vsi_name": "cust_b_vsi",
    "vni": 5001,
    "status": "DRAFT"
  }
}
```

---

### 2.4 服务管理 API

#### GET /api/v1/services
**查询服务实例列表**

**查询参数**:
```
?service_type=L3VPN
&status=ACTIVE
&customer_id=cust_001
&page=1
&page_size=20
```

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "total": 100,
    "page": 1,
    "page_size": 20,
    "items": [
      {
        "id": "service_uuid",
        "service_code": "SVC-L3VPN-001-20260407",
        "service_type": "L3VPN",
        "status": "ACTIVE",
        "sla_target": 99.5,
        "current_sla": 99.6,
        "created_at": "2026-04-07T13:45:22Z"
      }
    ]
  }
}
```

---

#### GET /api/v1/services/{serviceId}
**查询服务详情**

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "id": "service_uuid",
    "service_code": "SVC-L3VPN-001-20260407",
    "service_type": "L3VPN",
    "status": "ACTIVE",
    "vrf_config": {
      "vrf_name": "cust_a_vrf",
      "rd": "65001:1001",
      "import_rts": ["65001:1001"],
      "export_rts": ["65001:1001"]
    },
    "endpoints": [
      {
        "site_name": "广州总部",
        "device": "PE1",
        "interface": "GigabitEthernet0/0/0",
        "ac_vlan": 2001,
        "bandwidth_mbps": 100
      }
    ],
    "sla_metrics": {
      "availability%": 99.6,
      "latency_p95_ms": 45,
      "jitter_p95_ms": 5
    },
    "related_changes": [
      {
        "change_no": "CHG-20260407-001",
        "type": "EXPAND",
        "status": "SUCCESS"
      }
    ]
  }
}
```

---

### 2.5 变更 API

#### GET /api/v1/changes
**查询变更单列表**

**查询参数**:
```
?status=APPROVED
&risk_level=HIGH
&page=1
&page_size=20
```

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "total": 50,
    "items": [
      {
        "id": "change_uuid",
        "change_no": "CHG-20260407-001",
        "service_code": "SVC-L3VPN-001-20260407",
        "change_type": "EXPAND",
        "status": "APPROVED",
        "risk_level": "MEDIUM",
        "need_dual_approval": false,
        "scheduled_start": "2026-04-21T22:00:00Z",
        "created_at": "2026-04-07T13:45:22Z"
      }
    ]
  }
}
```

---

#### POST /api/v1/changes/{changeId}/precheck
**执行预检查**

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "change_no": "CHG-20260407-001",
    "precheck_results": [
      {
        "item": "syntax_check",
        "status": "PASSED",
        "message": "",
        "severity": "BLOCKING"
      },
      {
        "item": "resource_conflict_check",
        "status": "PASSED",
        "message": "无资源冲突",
        "severity": "BLOCKING"
      },
      {
        "item": "topology_reachability",
        "status": "PASSED",
        "message": "所有PE设备在线",
        "severity": "BLOCKING"
      },
      {
        "item": "rollback_point_check",
        "status": "WARNING",
        "message": "PE3无配置备份点,建议先备份",
        "severity": "WARNING"
      }
    ],
    "overall_status": "PASSED",  -- PASSED 或 FAILED
    "executed_at": "2026-04-07T14:00:00Z"
  }
}
```

---

#### POST /api/v1/changes/{changeId}/approve
**审批变更**

**请求**:
```json
{
  "approved": true,
  "comment": "已审批,可发布"
}
```

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "change_no": "CHG-20260407-001",
    "status": "APPROVED",
    "all_approvals_completed": true
  }
}
```

---

#### POST /api/v1/changes/{changeId}/deploy
**发布变更**

**请求**:
```json
{
  "batch_size": 5,              -- 单批最多下发设备数
  "stop_on_failure": true,      -- 失败是否停止
  "auto_rollback": true         -- 验证失败是否自动回滚
}
```

**响应** (202 Accepted):
```json
{
  "code": "0",
  "data": {
    "change_no": "CHG-20260407-001",
    "deploy_job_id": "deploy_job_uuid",
    "status": "RUNNING",
    "started_at": "2026-04-21T22:00:00Z"
  }
}
```

---

#### GET /api/v1/changes/{changeId}/deploy/{deployJobId}/logs
**获取发布执行日志(WebSocket 或 长轮询)**

**WebSocket URL**:
```
wss://api.sdn-controller.com/api/v1/ws/deploy/{deployJobId}/logs?token={jwt_token}
```

**日志消息格式**:
```json
{
  "time": "2026-04-21T22:05:30Z",
  "batch_no": 1,
  "device": "PE1",
  "stage": "connecting",
  "message": "正在连接NETCONF...",
  "status": "running"
}
```

---

#### POST /api/v1/changes/{changeId}/rollback
**触发回滚**

**请求**:
```json
{
  "rollback_type": "AUTO",      -- AUTO 或 MANUAL
  "selected_batches": [1, 2],   -- 可选,指定回滚的批次
  "comment": "发现业务故障,需立即回滚"
}
```

**响应** (202 Accepted):
```json
{
  "code": "0",
  "data": {
    "change_no": "CHG-20260407-001",
    "rollback_job_id": "rollback_job_uuid",
    "status": "ROLLING_BACK",
    "started_at": "2026-04-21T22:10:00Z"
  }
}
```

---

### 2.6 告警 API

#### GET /api/v1/alarms
**查询告警列表**

**查询参数**:
```
?severity=P1,P2
&status=NEW,ACKNOWLEDGED
&source_type=LINK
&page=1
&page_size=20
```

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "total": 15,
    "items": [
      {
        "id": "alarm_uuid",
        "alarm_code": "LINK_DOWN",
        "alarm_title": "链路故障: PE1-PE2",
        "severity": "P1",
        "source": "PE1_GE0/0/0",
        "status": "NEW",
        "first_occurred_at": "2026-04-07T13:45:00Z",
        "last_occurred_at": "2026-04-07T14:00:00Z",
        "aggregate_count": 3,
        "related_services": ["SVC-L3VPN-001"],
        "suggested_action": "检查物理链接"
      }
    ]
  }
}
```

---

#### GET /api/v1/alarms/{alarmId}
**查询告警详情**

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "id": "alarm_uuid",
    "alarm_code": "LINK_DOWN",
    "description": "PE1到PE2的链路宕机，影响3个业务",
    "severity": "P1",
    "related_services": [
      {
        "service_code": "SVC-L3VPN-001",
        "service_type": "L3VPN",
        "status": "DEGRADED"
      }
    ],
    "root_cause_analysis": "物理链接断开,邻接协议DOWN",
    "suggested_actions": [
      "1. 检查物理光纤是否断开或有信号衰减",
      "2. 检查PE1和PE2的接口是否故障",
      "3. 如无物理故障,建议自动倒换备用路径"
    ],
    "auto_remediation": {
      "triggered": true,
      "action": "自动倒换至备用LSP",
      "result": "SUCCESS"
    },
    "operations_log": [
      {
        "time": "2026-04-07T13:45:30Z",
        "operator": "noc_001",
        "action": "ACKNOWLEDGE",
        "comment": "已知悉,正在处理"
      }
    ]
  }
}
```

---

#### POST /api/v1/alarms/{alarmId}/acknowledge
**确认告警**

**请求**:
```json
{
  "comment": "已知悉,正在处理"
}
```

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "alarm_id": "alarm_uuid",
    "status": "ACKNOWLEDGED",
    "acknowledged_by": "noc_001",
    "acknowledged_at": "2026-04-07T14:00:00Z"
  }
}
```

---

### 2.7 性能与 SLA API

#### GET /api/v1/metrics/query
**查询性能指标**

**查询参数**:
```
?metric_type=interface_traffic
&interface_id={interface_uuid}
&start_time=2026-04-01T00:00:00Z
&end_time=2026-04-07T23:59:59Z
&interval=1m
```

响应 (200 OK):
```json
{
  "code": "0",
  "data": {
    "metric_type": "interface_traffic",
    "interface": "PE1_GE0/0/0",
    "series": [
      {
        "timestamp": "2026-04-07T13:00:00Z",
        "in_bps": 500000000,
        "out_bps": 450000000,
        "drop_pps": 0,
        "error_pps": 0
      },
      {
        "timestamp": "2026-04-07T13:01:00Z",
        "in_bps": 520000000,
        "out_bps": 480000000,
        "drop_pps": 5,
        "error_pps": 0
      }
    ]
  }
}
```

---

#### GET /api/v1/sla/dashboard
**查询 SLA 看板**

**查询参数**:
```
?dimension=customer | service_type | service
&period=day | week | month
&start_date=2026-04-01
&end_date=2026-04-07
```

**响应** (200 OK):
```json
{
  "code": "0",
  "data": {
    "period": "month",
    "start_date": "2026-04-01",
    "end_date": "2026-04-30",
    "summary": {
      "total_services": 150,
      "avg_sla_percent": 99.7,
      "violation_count": 2
    },
    "by_customer": [
      {
        "customer": "CustomerA",
        "sla_percent": 99.9,
        "violation_minutes": 0,
        "services": [
          {
            "service_code": "SVC-L3VPN-001",
            "sla_percent": 99.9,
            "violations": []
          }
        ]
      }
    ]
  }
}
```

---

## 3. 南向适配器接口

### 3.1 NETCONF 适配器

**目标**: 使用 YANG data model 进行结构化配置下发

**核心操作**:
1. `lock()` - 锁定候选配置
2. `edit-config()` - 发送配置
3. `validate()` - 语法校验
4. `commit()` - 提交配置
5. `unlock()` - 释放锁

**配置片段示例** (Huawei VRP YANG):
```xml
<config>
  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
    <interface>
      <name>GigabitEthernet0/0/0</name>
      <enabled>true</enabled>
      <ipv4 xmlns="urn:ietf:params:xml:ns:yang:ietf-ip">
        <enabled>true</enabled>
        <address>
          <ip>10.1.1.1</ip>
          <prefix-length>24</prefix-length>
        </address>
      </ipv4>
    </interface>
  </interfaces>
  <routing xmlns="urn:ietf:params:xml:ns:yang:ietf-routing">
    <control-plane-protocols>
      <control-plane-protocol>
        <type>bgp</type>
        <name>default</name>
        <bgp xmlns="urn:ietf:params:xml:ns:yang:ietf-bgp">
          <global>
            <as>65001</as>
          </global>
        </bgp>
      </control-plane-protocol>
    </control-plane-protocols>
  </routing>
</config>
```

---

### 3.2 SSH CLI 适配器

**目标**: 兼容仅支持命令行的遗留设备

**核心逻辑**:
1. 连接设备 (SSH)
2. 进入配置模式 (`system-view`)
3. 逐行下发命令，期望输出匹配
4. 保存配置 (`save`)

**命令集示例**:
```
system-view
interface GigabitEthernet0/0/0
 ipv4 address 10.1.1.1 255.255.255.0
 no shutdown
exit
router bgp 65001
 bgp router-id 10.0.0.1
 peer 10.1.1.2 as-number 65002
 ipv4-family unicast
  network 10.0.0.0 255.0.0.0
  neighbor 10.1.1.2 enable
 quit
quit
save
```

---

## 4. 错误处理与重试

### 4.1 网络错误重试策略

```
最大重试次数: 3
初始延迟: 1秒
延迟因子: 2 (exponential backoff)
最大延迟: 32秒

重试条件:
  - 网络超时
  - 临时连接错误
  - HTTP 5xx 错误

不重试条件:
  - 认证失败 (401)
  - 无权限 (403)  
  - 资源不存在 (404)
  - 业务规则错误 (400)
```

---

**文档版本**: v1.0  
**最后更新**: 2026-04-07
