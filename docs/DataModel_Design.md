# SDN 控制器 - 核心数据模型设计

## 1. 数据库初始化配置

### 1.1 主数据库: PostgreSQL

```sql
-- 创建库和基础配置
CREATE DATABASE sdn_controller
  ENCODING 'UTF8'
  LC_COLLATE 'en_US.UTF-8'
  LC_CTYPE 'en_US.UTF-8';

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS jsonb;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- 全文索引支持
```

### 1.2 时序数据库: TimescaleDB (可选PostgreSQL扩展)

```sql
-- 在PostgreSQL上启用TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 用于性能指标时序表创建
```

---

## 2. IAM (身份与访问管理)

### 2.1 users 表

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR(64) NOT NULL UNIQUE,
  email       VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),         -- bcrypt哈希
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret  VARCHAR(255),           -- TOTP密钥(加密存储)
  status      VARCHAR(20) DEFAULT 'ACTIVE',
                -- ACTIVE, LOCKED(登录失败5次), DISABLED(管理员禁用)
  last_login  TIMESTAMP,
  last_password_change TIMESTAMP,
  tenant_id   VARCHAR(64),            -- 多租户支持
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT user_status_check CHECK (status IN ('ACTIVE', 'LOCKED', 'DISABLED'))
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_status ON users(status);
```

### 2.2 roles 表

```sql
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code   VARCHAR(64) NOT NULL UNIQUE,
              -- SUPER_ADMIN, NETWORK_ARCHITECT, PROVISION_ENGINEER, NOC_OPERATOR, APPROVER, AUDITOR
  role_name   VARCHAR(255) NOT NULL,
  description TEXT,
  tenant_id   VARCHAR(64),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roles_code ON roles(role_code);
CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);
```

### 2.3 user_roles 表

```sql
CREATE TABLE user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  tenant_id   VARCHAR(64),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES users(id),
  
  UNIQUE (user_id, role_id, tenant_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_tenant_id ON user_roles(tenant_id);
```

### 2.4 permissions 表 (RBAC权限矩阵)

```sql
CREATE TABLE permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  resource    VARCHAR(64) NOT NULL,     -- 'orders', 'services', 'changes', etc.
  action      VARCHAR(64) NOT NULL,     -- 'CREATE', 'READ', 'UPDATE', 'DELETE'
  condition   JSONB,                    -- ABAC条件 {status: 'DRAFT', owner: 'self'}
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (role_id, resource, action)
);

CREATE INDEX idx_perms_role_id ON permissions(role_id);
CREATE INDEX idx_perms_resource ON permissions(resource);
```

---

## 3. 资源管理 (Inventory)

### 3.1 devices 表

```sql
CREATE TABLE devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname    VARCHAR(255) NOT NULL UNIQUE,
  mgmt_ip     INET NOT NULL UNIQUE,
  vendor      VARCHAR(64),              -- Huawei
  model       VARCHAR(64),              -- AR6300, CloudEngine, etc.
  version     VARCHAR(64),              -- 软件版本号
  serial_number VARCHAR(255),
  status      VARCHAR(20) DEFAULT 'ONLINE',
              -- ONLINE, OFFLINE, UNREACHABLE, MAINTENANCE
  managed     BOOLEAN DEFAULT FALSE,    -- 是否纳管
  connection_type VARCHAR(20) DEFAULT 'NETCONF',
              -- NETCONF, SSH_CLI, SNMP
  last_heartbeat TIMESTAMP,
  last_discovery TIMESTAMP,
  config_snapshot_id UUID,              -- 最新快照ID
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT device_status_check CHECK (status IN ('ONLINE', 'OFFLINE', 'UNREACHABLE', 'MAINTENANCE')),
  CONSTRAINT device_conn_type_check CHECK (connection_type IN ('NETCONF', 'SSH_CLI', 'SNMP'))
);

CREATE INDEX idx_devices_hostname ON devices(hostname);
CREATE INDEX idx_devices_mgmt_ip ON devices(mgmt_ip);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_vendor ON devices(vendor);
CREATE INDEX idx_devices_managed ON devices(managed);
```

### 3.2 interfaces 表

```sql
CREATE TABLE interfaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  if_name     VARCHAR(64) NOT NULL,     -- GigabitEthernet0/0/0, etc.
  if_type     VARCHAR(32),              -- GigabitEthernet, TenGigE, etc.
  admin_state VARCHAR(20) DEFAULT 'UP',
  oper_state  VARCHAR(20) DEFAULT 'UP',
  bandwidth_mbps INTEGER,               -- 1000 for GigabitEthernet
  mtu         INTEGER DEFAULT 1500,
  ip_address  INET,
  subnet_mask INET,
  description TEXT,
  last_status_change TIMESTAMP,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (device_id, if_name)
);

CREATE INDEX idx_interfaces_device_id ON interfaces(device_id);
CREATE INDEX idx_interfaces_if_name ON interfaces(if_name);
CREATE INDEX idx_interfaces_oper_state ON interfaces(oper_state);
```

### 3.3 links 表 (邻接关系)

```sql
CREATE TABLE links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  a_if_id     UUID NOT NULL REFERENCES interfaces(id) ON DELETE CASCADE,
  z_if_id     UUID NOT NULL REFERENCES interfaces(id) ON DELETE CASCADE,
  link_type   VARCHAR(32),              -- ethernet, optical, virtual
  metric      INTEGER DEFAULT 1,         -- IGP度量值
  capacity_mbps INTEGER,                 -- 链路容量(Mbps)
  utilization_pct NUMERIC(5, 2),        -- 利用率(%)
  status      VARCHAR(20) DEFAULT 'UP',
  last_update TIMESTAMP,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CHECK (a_if_id != z_if_id)             -- 防止自环
);

CREATE INDEX idx_links_a_if_id ON links(a_if_id);
CREATE INDEX idx_links_z_if_id ON links(z_if_id);
CREATE INDEX idx_links_status ON links(status);
```

### 3.4 config_snapshots 表 (配置版本管理)

```sql
CREATE TABLE config_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  snapshot_type VARCHAR(20),            -- FULL, PARTIAL, PRE_CHANGE, POST_CHANGE
  content_uri VARCHAR(1024),            -- MinIO对象存储路径 s3://bucket/path
  content_size_kb INTEGER,
  content_hash VARCHAR(64),             -- SHA256用于完整性校验
  related_change_id UUID,               -- 关联的变更单ID(可选)
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by  UUID REFERENCES users(id),
  remarks     TEXT
);

CREATE INDEX idx_snapshots_device_id ON config_snapshots(device_id);
CREATE INDEX idx_snapshots_created_at ON config_snapshots(created_at DESC);
CREATE INDEX idx_snapshots_change_id ON config_snapshots(related_change_id);
```

---

## 4. 资源池管理 (Resource Pools)

### 4.1 resource_pools 表

```sql
CREATE TABLE resource_pools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_type   VARCHAR(32) NOT NULL,
              -- VLAN, VNI, RD, RT, IP_LOOPBACK, IP_PEER, IP_BUSINESS, PORT
  pool_name   VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  scope       VARCHAR(32) DEFAULT 'GLOBAL',
              -- GLOBAL, REGION, SITE
  scope_id    VARCHAR(255),            -- 作用域边界标识(如region name)
  min_value   INTEGER,
  max_value   INTEGER,
  total_count INTEGER,                 -- 总资源数
  allocated_count INTEGER DEFAULT 0,
  utilization_pct NUMERIC(5, 2),      -- 占用率
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pools_type ON resource_pools(pool_type);
CREATE INDEX idx_pools_scope ON resource_pools(scope, scope_id);
```

### 4.2 pool_allocations 表 (资源占用情况)

```sql
CREATE TABLE pool_allocations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id     UUID NOT NULL REFERENCES resource_pools(id) ON DELETE CASCADE,
  resource_key VARCHAR(255),           -- 具体的资源值(如VLAN号: 2001)
  service_id  UUID,                    -- 关联的service ID
  allocated_by UUID REFERENCES users(id),
  allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status      VARCHAR(20) DEFAULT 'ALLOCATED',
              -- ALLOCATED, RESERVED, RELEASED, EXPIRED
  expire_at   TIMESTAMP,               -- 资源过期时间(可选)
  remarks     TEXT,
  
  UNIQUE (pool_id, resource_key, status)
);

CREATE INDEX idx_allocations_pool_id ON pool_allocations(pool_id);
CREATE INDEX idx_allocations_service_id ON pool_allocations(service_id);
CREATE INDEX idx_allocations_status ON pool_allocations(status);
CREATE INDEX idx_allocations_allocated_at ON pool_allocations(allocated_at DESC);
```

---

## 5. 服务模型 (Services)

### 5.1 service_orders 表 (工单)

```sql
CREATE TABLE service_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no    VARCHAR(64) NOT NULL UNIQUE,  -- 生成格式: ORD-20260407-001
  service_type VARCHAR(32) NOT NULL,       -- L3VPN, VPLS, LEASED_LINE, DIA
  customer_id UUID,
  problem_description TEXT,
  requested_bandwidth_mbps INTEGER,
  sla_target_percent NUMERIC(5, 2),
  requested_completion_at TIMESTAMP,
  priority    INTEGER DEFAULT 3,            -- 1(最高) - 5(最低)
  status      VARCHAR(32) DEFAULT 'DRAFT',
              -- DRAFT, SUBMITTED, APPROVED, REJECTED, PLANNING, DEPLOYING, ACTIVE, CHANGING, TERMINATING, TERMINATED
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT order_status_check CHECK (status IN (
    'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PLANNING', 
    'DEPLOYING', 'ACTIVE', 'CHANGING', 'TERMINATING', 'TERMINATED'
  ))
);

CREATE INDEX idx_orders_order_no ON service_orders(order_no);
CREATE INDEX idx_orders_status ON service_orders(status);
CREATE INDEX idx_orders_customer_id ON service_orders(customer_id);
CREATE INDEX idx_orders_created_at ON service_orders(created_at DESC);
```

### 5.2 service_instances 表 (服务实例)

```sql
CREATE TABLE service_instances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_code VARCHAR(64) NOT NULL UNIQUE,  -- 生成格式: SVC-L3VPN-001-20260407
  service_type VARCHAR(32) NOT NULL,        -- L3VPN, VPLS, etc.
  order_id    UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  version     INTEGER DEFAULT 1,
  status      VARCHAR(32) DEFAULT 'DRAFT',
              -- DRAFT, ACTIVE, DEGRADED, CHANGING, TERMINATING, TERMINATED
  current_sla_percent NUMERIC(5, 2),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT instance_status_check CHECK (status IN (
    'DRAFT', 'ACTIVE', 'DEGRADED', 'CHANGING', 'TERMINATING', 'TERMINATED'
  ))
);

CREATE INDEX idx_instances_code ON service_instances(service_code);
CREATE INDEX idx_instances_status ON service_instances(status);
CREATE INDEX idx_instances_order_id ON service_instances(order_id);
```

### 5.3 service_endpoints 表

```sql
CREATE TABLE service_endpoints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL REFERENCES service_instances(id) ON DELETE CASCADE,
  site_name   VARCHAR(255),
  device_id   UUID REFERENCES devices(id),
  interface_id UUID REFERENCES interfaces(id),
  vlan_id     INTEGER,                  -- AC侧VLAN标签
  ac_ip_addr  INET,                     -- AC侧IP地址
  ac_subnet_mask INET,
  role        VARCHAR(20),              -- PRIMARY, BACKUP, STANDBY
  bandwidth_mbps INTEGER,
  endpoint_index INTEGER,              -- 端点顺序号(1, 2, 3...)
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (service_id, interface_id)
);

CREATE INDEX idx_endpoints_service_id ON service_endpoints(service_id);
CREATE INDEX idx_endpoints_device_id ON service_endpoints(device_id);
CREATE INDEX idx_endpoints_interface_id ON service_endpoints(interface_id);
```

---

## 6. L3/L2业务模型

### 6.1 l3vpn_instances 表

```sql
CREATE TABLE l3vpn_instances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL UNIQUE REFERENCES service_instances(id) ON DELETE CASCADE,
  vrf_name    VARCHAR(64) NOT NULL UNIQUE,
  rd          VARCHAR(64) NOT NULL,     -- 64-bit: AS:value或IP:value格式
  import_rts  TEXT[],                  -- JSONB或数组, 例: ['100:1', '100:2']
  export_rts  TEXT[],
  route_policy_name VARCHAR(255),      -- 可选
  route_policy_content TEXT,           -- 配置内容
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_l3vpn_service_id ON l3vpn_instances(service_id);
CREATE INDEX idx_l3vpn_vrf_name ON l3vpn_instances(vrf_name);
```

### 6.2 vpls_instances 表

```sql
CREATE TABLE vpls_instances (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id  UUID NOT NULL UNIQUE REFERENCES service_instances(id) ON DELETE CASCADE,
  vsi_name    VARCHAR(64) NOT NULL UNIQUE,
  vpls_id     VARCHAR(64),              -- VSI编号(Huawei特有)
  vni         INTEGER,                  -- VXLAN VNI或MPLS VNI
  rd          VARCHAR(64),
  import_rt   VARCHAR(64),
  export_rt   VARCHAR(64),
  p2p_tunnel_id UUID REFERENCES tunnel_policies(id),  -- 关联TE隧道
  tunnel_encapsulation VARCHAR(32),    -- MPLS, VXLAN
  mtu         INTEGER DEFAULT 1500,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vpls_service_id ON vpls_instances(service_id);
CREATE INDEX idx_vpls_vsi_name ON vpls_instances(vsi_name);
```

---

## 7. 策略与模板

### 7.1 tunnel_policies 表 (TE策略库)

```sql
CREATE TABLE tunnel_policies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  src_device_id UUID REFERENCES devices(id),
  dst_device_id UUID REFERENCES devices(id),
  primary_path_id UUID,                -- 关联explicit_paths
  backup_path_id UUID,
  tunnel_mode VARCHAR(32) DEFAULT '1:1',
              -- 1:1, N:1, UNPROTECTED
  wait_to_restore_sec INTEGER DEFAULT 300,  -- WTR时间
  reserved_bandwidth_mbps INTEGER,     -- 隧道带宽约束
  priority    INTEGER DEFAULT 1,        -- 1(最高优先级)
  status      VARCHAR(20) DEFAULT 'ACTIVE',
  version     INTEGER DEFAULT 1,       -- 版本号
  published   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tunnel_policies_name ON tunnel_policies(policy_name);
CREATE INDEX idx_tunnel_policies_src_dst ON tunnel_policies(src_device_id, dst_device_id);
CREATE INDEX idx_tunnel_policies_published ON tunnel_policies(published);
```

### 7.2 explicit_paths 表

```sql
CREATE TABLE explicit_paths (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_name   VARCHAR(255) NOT NULL UNIQUE,
  src_device_id UUID REFERENCES devices(id),
  dst_device_id UUID REFERENCES devices(id),
  hops_json   JSONB,                   -- [{"hop_index":1, "device_id":"...", "type":"strict"}, ...]
  total_cost  NUMERIC(10, 2),
  total_delay_ms NUMERIC(10, 2),
  validate_status VARCHAR(20),         -- VALID, INVALID, LOOP, UNREACHABLE
  validate_error_msg TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_explicit_paths_name ON explicit_paths(path_name);
CREATE INDEX idx_explicit_paths_src_dst ON explicit_paths(src_device_id, dst_device_id);
```

### 7.3 qos_profiles 表

```sql
CREATE TABLE qos_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name VARCHAR(255) NOT NULL UNIQUE,
  cir_mbps    INTEGER,                 -- Committed Info Rate
  pir_mbps    INTEGER,                 -- Peak Info Rate
  cbs_bytes   BIGINT,                  -- Committed Burst Size
  pbs_bytes   BIGINT,                  -- Peak Burst Size
  priority_queue VARCHAR(32),          -- EF, AF, BE等
  queue_weight INTEGER,                -- WRR权重
  drop_algorithm VARCHAR(32),          -- TAILDROP, WRED
  version     INTEGER DEFAULT 1,
  published   BOOLEAN DEFAULT FALSE,
  remarks     TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_qos_profiles_name ON qos_profiles(profile_name);
CREATE INDEX idx_qos_profiles_published ON qos_profiles(published);
```

### 7.4 sla_profiles 表

```sql
CREATE TABLE sla_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_name VARCHAR(255) NOT NULL UNIQUE,
  availability_target_percent NUMERIC(5, 2),
  latency_target_ms INTEGER,
  jitter_target_ms INTEGER,
  loss_rate_target_percent NUMERIC(5, 3),
  
  -- BFD参数
  bfd_tx_ms   INTEGER DEFAULT 100,
  bfd_rx_ms   INTEGER DEFAULT 100,
  bfd_mult    INTEGER DEFAULT 3,
  
  -- NQA参数
  nqa_probe_type VARCHAR(32),          -- ICMP, TCP, HTTP
  nqa_frequency_sec INTEGER DEFAULT 60,
  nqa_timeout_ms INTEGER DEFAULT 5000,
  nqa_failure_threshold INTEGER DEFAULT 3,
  
  -- 告警规则 JSONB数组
  alarm_rules JSONB,  -- [{metric: 'latency', operator: '>', value: 80, severity: 'P2'}, ...]
  
  version     INTEGER DEFAULT 1,
  published   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sla_profiles_name ON sla_profiles(profile_name);
CREATE INDEX idx_sla_profiles_published ON sla_profiles(published);
```

---

## 8. 变更与发布

### 8.1 change_requests 表 (变更单)

```sql
CREATE TABLE change_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_no   VARCHAR(64) NOT NULL UNIQUE,   -- CHG-20260407-001
  service_id  UUID REFERENCES service_instances(id),
  change_type VARCHAR(32) NOT NULL,         -- NEW, EXPAND, REDUCE, MIGRATE, ROLLBACK
  prev_config_snapshot_id UUID,
  new_config_snapshot_id UUID,
  
  -- 风险评分与审批
  risk_level  VARCHAR(20) DEFAULT 'MEDIUM',  -- LOW, MEDIUM, HIGH
  risk_score  NUMERIC(5, 2),                 -- 0-100
  need_dual_approval BOOLEAN DEFAULT FALSE,
  
  -- 状态流转
  status      VARCHAR(32) DEFAULT 'CREATED',
              -- CREATED, PRECHECK_PASSED, APPROVING, APPROVED, SCHEDULED, RUNNING, SUCCESS, FAILED, ROLLING_BACK, ROLLBACK_SUCCESS, ROLLBACK_FAILED
  precheck_passed BOOLEAN DEFAULT FALSE,
  precheck_result JSONB,                      -- [{item: 'syntax_check', status: 'PASSED', message: ''}, ...]
  
  -- 发布调度
  scheduled_start_at TIMESTAMP,
  scheduled_end_at TIMESTAMP,
  release_window_id UUID,
  
  -- 执行信息
  deployed_by  UUID REFERENCES users(id),
  deploy_start_at TIMESTAMP,
  deploy_end_at TIMESTAMP,
  deploy_result JSONB,                       -- [{device: 'PE1', status: 'SUCCESS', command_count: 50}, ...]
  
  -- 关联字段
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT change_status_check CHECK (status IN (
    'CREATED', 'PRECHECK_PASSED', 'APPROVING', 'APPROVED', 'SCHEDULED', 
    'RUNNING', 'SUCCESS', 'FAILED', 'ROLLING_BACK', 'ROLLBACK_SUCCESS', 'ROLLBACK_FAILED'
  ))
);

CREATE INDEX idx_changes_change_no ON change_requests(change_no);
CREATE INDEX idx_changes_status ON change_requests(status);
CREATE INDEX idx_changes_service_id ON change_requests(service_id);
CREATE INDEX idx_changes_created_at ON change_requests(created_at DESC);
```

### 8.2 change_approvals 表

```sql
CREATE TABLE change_approvals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id   UUID NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES users(id),
  required    BOOLEAN DEFAULT FALSE,   -- 是否是必需审批人
  approval_status VARCHAR(20),         -- PENDING, APPROVED, REJECTED
  approval_comment TEXT,
  approved_at TIMESTAMP,
  
  UNIQUE (change_id, approver_id)
);

CREATE INDEX idx_approvals_change_id ON change_approvals(change_id);
CREATE INDEX idx_approvals_approver_id ON change_approvals(approver_id);
CREATE INDEX idx_approvals_status ON change_approvals(approval_status);
```

### 8.3 deploy_jobs 表

```sql
CREATE TABLE deploy_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id   UUID NOT NULL REFERENCES change_requests(id),
  batch_no    INTEGER,                 -- 批次号
  status      VARCHAR(32) DEFAULT 'PENDING',
              -- PENDING, RUNNING, PAUSED, SUCCESS, FAILED, ROLLED_BACK
  started_at  TIMESTAMP,
  ended_at    TIMESTAMP,
  total_devices_count INTEGER,
  success_devices_count INTEGER DEFAULT 0,
  failed_devices_count INTEGER DEFAULT 0,
  executor_id UUID REFERENCES users(id),
  
  UNIQUE (change_id, batch_no)
);

CREATE INDEX idx_deploy_jobs_change_id ON deploy_jobs(change_id);
CREATE INDEX idx_deploy_jobs_status ON deploy_jobs(status);
```

### 8.4 deploy_tasks 表

```sql
CREATE TABLE deploy_tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deploy_job_id UUID NOT NULL REFERENCES deploy_jobs(id) ON DELETE CASCADE,
  device_id   UUID NOT NULL REFERENCES devices(id),
  status      VARCHAR(32) DEFAULT 'PENDING',
              -- PENDING, RUNNING, SUCCESS, FAILED, ROLLED_BACK
  command_count INTEGER,
  commands_data TEXT,                  -- 下发的命令行/XML配置
  start_at    TIMESTAMP,
  end_at      TIMESTAMP,
  error_msg   TEXT,
  
  UNIQUE (deploy_job_id, device_id)
);

CREATE INDEX idx_tasks_deploy_job_id ON deploy_tasks(deploy_job_id);
CREATE INDEX idx_tasks_device_id ON deploy_tasks(device_id);
CREATE INDEX idx_tasks_status ON deploy_tasks(status);
```

### 8.5 rollback_jobs 表

```sql
CREATE TABLE rollback_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deploy_job_id UUID NOT NULL REFERENCES deploy_jobs(id),
  rollback_type VARCHAR(32),           -- AUTO, MANUAL, HYBRID
  triggered_reason TEXT,               -- 自动回滚原因: verification failed, etc.
  status      VARCHAR(32),             -- PENDING, RUNNING, SUCCESS, FAILED
  start_at    TIMESTAMP,
  end_at      TIMESTAMP,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rollbacks_deploy_job_id ON rollback_jobs(deploy_job_id);
```

---

## 9. 运营与保障

### 9.1 alarms 表

```sql
CREATE TABLE alarms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alarm_code  VARCHAR(64),             -- LINK_DOWN, BGP_SESSION_DOWN, etc.
  alarm_title TEXT,
  alarm_severity VARCHAR(2),           -- P1, P2, P3, P4
  alarm_source_type VARCHAR(32),      -- DEVICE, LINK, SERVICE, SYSTEM
  alarm_source_id UUID,                -- 关联的资源ID
  description TEXT,
  
  -- 状态与处置
  status      VARCHAR(20) DEFAULT 'NEW',
              -- NEW, ACKNOWLEDGED, RESOLVED, CLOSED
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  root_cause_analysis TEXT,            -- 根因分析
  suggested_action TEXT,               -- 建议处置
  
  -- 聚合
  aggregate_count INTEGER DEFAULT 1,   -- 聚合告警数
  first_occurred_at TIMESTAMP,
  last_occurred_at TIMESTAMP,
  
  -- 来源
  source_system VARCHAR(64),           -- SNMP, SYSLOG, BFD, NQA
  
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT alarm_severity_check CHECK (alarm_severity IN ('P1', 'P2', 'P3', 'P4'))
);

CREATE INDEX idx_alarms_status ON alarms(status);
CREATE INDEX idx_alarms_severity ON alarms(alarm_severity);
CREATE INDEX idx_alarms_source_id ON alarms(alarm_source_id);
CREATE INDEX idx_alarms_created_at ON alarms(created_at DESC);
```

### 9.2 metrics_interface_1m 表 (用TimescaleDB)

```sql
CREATE TABLE metrics_interface_1m (
  time        TIMESTAMP NOT NULL,
  interface_id UUID NOT NULL,
  in_bps      BIGINT,                  -- 入流量(bps)
  out_bps     BIGINT,                  -- 出流量(bps)
  drop_pps    BIGINT,                  -- 丢包率(pps)
  error_pps   BIGINT,                  -- 错包率(pps)
  PRIMARY KEY (time, interface_id)
);

-- 转为TimescaleDB超表
SELECT create_hypertable('metrics_interface_1m', 'time', if_not_exists => TRUE));
CREATE INDEX ON metrics_interface_1m (interface_id, time DESC);
```

### 9.3 metrics_tunnel_1m 表

```sql
CREATE TABLE metrics_tunnel_1m (
  time        TIMESTAMP NOT NULL,
  tunnel_policy_id UUID NOT NULL,
  delay_ms    NUMERIC(10, 2),          -- 时延(ms)
  jitter_ms   NUMERIC(10, 2),          -- 抖动(ms)
  loss_pct    NUMERIC(5, 3),           -- 丢包率(%)
  PRIMARY KEY (time, tunnel_policy_id)
);

SELECT create_hypertable('metrics_tunnel_1m', 'time', if_not_exists => TRUE);
CREATE INDEX ON metrics_tunnel_1m (tunnel_policy_id, time DESC);
```

### 9.4 sla_results_daily 表

```sql
CREATE TABLE sla_results_daily (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_date DATE NOT NULL,
  service_id  UUID NOT NULL,
  availability_percent NUMERIC(5, 2),
  latency_p95_ms NUMERIC(10, 2),
  jitter_p95_ms NUMERIC(10, 2),
  loss_rate_pct NUMERIC(5, 3),
  sla_met     BOOLEAN,                 -- 是否达标
  failure_minutes INTEGER,             -- 故障分钟数
  violation_details JSONB,             -- 违约明细
  
  UNIQUE (result_date, service_id)
);

CREATE INDEX idx_sla_results_service_id ON sla_results_daily(service_id);
CREATE INDEX idx_sla_results_date ON sla_results_daily(result_date DESC);
```

---

## 10. 审计与系统

### 10.1 audit_logs 表

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_time  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actor_id    UUID REFERENCES users(id),
  actor_name  VARCHAR(255),
  action_type VARCHAR(64),             -- LOGIN, CREATE, UPDATE, DELETE, APPROVE, DEPLOY, ROLLBACK
  resource_type VARCHAR(64),           -- USER, DEVICE, SERVICE, CHANGE, CONFIG
  resource_id UUID,
  resource_name VARCHAR(255),
  
  -- 详细信息
  old_value   JSONB,                   -- 变更前的值
  new_value   JSONB,                   -- 变更后的值
  description TEXT,
  
  -- 完整性保护
  prev_log_hash VARCHAR(64),           -- 前一条日志的SHA256(用于链式保护)
  log_hash    VARCHAR(64),             -- 本条日志的SHA256
  
  -- 来源信息
  source_ip   INET,
  user_agent  VARCHAR(512),
  
  UNIQUE (audit_time, actor_id, resource_id, action_type)
);

CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_audit_time ON audit_logs(audit_time DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
```

### 10.2 release_windows 表

```sql
CREATE TABLE release_windows (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  
  -- 时间安排
  schedule_type VARCHAR(20) DEFAULT 'WEEKLY',  -- ONCE, DAILY, WEEKLY, MONTHLY
  schedule_cron VARCHAR(255),          -- Cron表达式: "0 22 * * 5"(每周五22:00)
  start_hour  INTEGER,                 -- 窗口开始小时
  end_hour    INTEGER,                 -- 窗口结束小时
  start_minute INTEGER DEFAULT 0,
  end_minute  INTEGER DEFAULT 0,
  
  -- 容量控制
  max_concurrent_changes INTEGER DEFAULT 10,
  
  -- 自动化
  auto_deploy BOOLEAN DEFAULT FALSE,   -- 窗口内的变更自动发布
  
  enabled     BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_windows_enabled ON release_windows(enabled);
```

---

## 11. 版本迁移 (Database Migrations)

使用Flyway或Liquibase进行版本管理：

```
db/migration/
├── V1.0__initial_schema.sql         # 初始化所有表
├── V1.1__add_indices.sql            # 添加优化索引
├── V1.2__add_audit_logs.sql         # 审计日志支持
├── V2.0__add_multi_tenant.sql       # 多租户支持
└── V2.1__optimize_performance.sql   # 性能优化
```

---

## 12. 备份与恢复策略

- **备份频率**: 每日全量 + 每小时增量
- **备份位置**: NAS + 异地云存储
- **RTO**: < 4小时 (恢复时间目标)
- **RPO**: < 1小时 (恢复点目标)

---

## 13. 数据字典参考

| 字段名 | 取值范围 | 示例 |
|--------|--------|------|
| service_type | L3VPN, VPLS, LEASED_LINE, DIA | L3VPN |
| tunnel_mode | 1:1, N:1, UNPROTECTED | 1:1 |
| change_type | NEW, EXPAND, REDUCE, MIGRATE, ROLLBACK | EXPAND |
| alarm_severity | P1, P2, P3, P4 | P1 |
| device_status | ONLINE, OFFLINE, UNREACHABLE, MAINTENANCE | ONLINE |
| if_type | GigabitEthernet, TenGigE, HundredGigE | GigabitEthernet |

---

**文档版本**: v1.0  
**最后更新**: 2026-04-07
