# SDN 控制器 - 系统架构设计

## 1. 微服务架构总体设计

```
┌──────────────────────────────────────────────────────────────────┐
│                         北向 REST API (Kong/APISIX)              │
│  /api/v1/orders, /api/v1/services, /api/v1/changes, /api/v1/... │
└──────────────┬──────────────────────────────────────────────────┘
               │
     ┌─────────┴─────────┬────────────┬──────────┬──────────┬──────────┐
     │                   │            │          │          │          │
┌────▼────┐        ┌────▼────┐  ┌───▼──┐  ┌───▼──┐  ┌────▼─┐    ┌───▼──┐
│   IAM   │        │Inventory │  │Catalog
 │  PCE  │    ┌───▼──┐
│Service │        │  Orch    │  │     │  │Deploy │  │Report│    │Audit │
└────┬────┘        └────┬────┘  └───┬──┘  └───┬──┘  └────┬─┘    └───┬──┘
     │                  │           │        │         │         │
┌────▼──────────────────▼───────────▼────────▼─────────▼─────────▼────┐
│                                                                        │
│      Kafka/Redis/PostgreSQL/TimescaleDB/OpenSearch/MinIO             │
│                         共享数据与消息层                              │
└────────────────────┬───────────────────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
┌────▼────────────┐  │  ┌─────────────▼──────┐  ┌────────────▼─────┐
│ NETCONF Adapter │  │  │ SSH CLI Adapter     │  │ SNMP Telemetry   │
│ (YANG编辑)      │  │  │ (命令行管家)       │  │ Collector        │
└────▼────────────┘  │  └─────────────▼──────┘  └────────────▼─────┘
                     │               │                       │
     ┌───────────────┼───────────────┼───────────────────────┘
     │               │               │
     └───────────────┼───────────────┴─────────────────────────────────┐
                     │                                                  │
                ┌────▼──────────────────────────────────────────────┐  │
                │  南向网络设备 (Huawei VRP)                        │  │
                │ PE/RR/P/CE 等设备 (NETCONF/CLI)                 │  │
                └──────────────────────────────────┬───────────────┘  │
                                                   │                   │
                                    ┌──────────────┴───────────────┐   │
                                    │                              │   │
                          SNMP陷阱/Syslog事件 ← ─ ─ ────────────────┘
```

## 2. 微服务模块说明

### 2.1 iam-service (身份与访问管理)
**职责**: 认证、授权、租户隔离、RBAC与ABAC

**核心API**:
```
POST   /iam/auth/login              # 账号登录(支持MFA、SSO)
POST   /iam/auth/logout             # 登出
POST   /iam/auth/refresh-token      # Token刷新
GET    /iam/users                   # 用户列表(仅SuperAdmin)
POST   /iam/users                   # 新增用户
PUT    /iam/users/{id}              # 修改用户
DELETE /iam/users/{id}              # 删除用户
GET    /iam/roles                   # 角色列表
POST   /iam/roles                   # 新增自定义角色
GET    /iam/permissions             # 权限矩阵
POST   /iam/user-roles/{userId}     # 分配角色
```

**关键特性**:
- JWT Token (TTL 1小时，支持刷新)
- 角色基访问控制 (RBAC) + 属性基访问控制 (ABAC, 如：仅能操作自己提交的工单)
- MFA (TOTP或邮件OTP)
- SSO集成 (SAML/OIDC)
- 操作审计日志

**依赖**: PostgreSQL, Redis, OpenSearch(日志)

---

### 2.2 inventory-service (资源纳管)
**职责**: 设备纳管、拓扑发现、接口管理、资源池管理

**核心API**:
```
GET    /inventory/devices           # 设备列表
POST   /inventory/devices           # 纳管新设备
GET    /inventory/devices/{id}      # 设备详情
GET    /inventory/interfaces        # 接口列表
GET    /inventory/links             # 链路列表
GET    /topology/graph              # 拓扑图(L2/L3/MPLS)
GET    /pools/interfaces            # 接口资源池查询
POST   /pools/interfaces/allocate   # 端口分配
GET    /pools/ipam                  # IP地址池查询
GET    /pools/labels                # VLAN/VNI/RD/RT池查询
POST   /pools/{poolId}/allocate     # 资源分配
```

**关键特性**:
- 自动发现：通过SNMP/SSH执行"display version"、"display interface"等获取设备信息
- 邻接发现：LLDP、BGP邻接、ISIS邻接关系
- 资源冲突检测：在pool_allocations表中维护占用关系
- 配置快照：定期备份设备运行配置到MinIO对象存储

**数据模型**:
- devices, interfaces, links (邻接关系)
- resource_pools, pool_allocations (资源占用)
- config_snapshots (配置版本管理)

**依赖**: PostgreSQL, SNMP Collector, SSH Adapter, MinIO

---

### 2.3 catalog-service (服务与模板)
**职责**: 服务目录、L3VPN/VPLS模板、路径/QoS/SLA模板、模板版本管理

**核心API**:
```
GET    /catalog/services            # 服务目录列表
GET    /catalog/templates/l3vpn     # L3VPN模板列表
GET    /catalog/templates/vpls      # VPLS模板列表
POST   /policies/tunnel             # TE策略库
GET    /policies/tunnel/{id}        # TE策略详情
POST   /policies/qos                # QoS模板
POST   /policies/sla                # SLA模板
```

**关键特性**:
- 模板版本化：每次发布都创建新版本，支持版本回溯
- 发布流程：draft → approved → published
- 模板关联业务数统计

**数据模型**:
- service_templates (L3VPN、VPLS等)
- vrfs_template (VRF配置模板, 含RD/RT)
- tunnel_policies (TE显式路径)
- qos_profiles, sla_profiles

**依赖**: PostgreSQL, audit-service

---

### 2.4 orchestration-service (业务编排)
**职责**: 工单接收、意图模型生成、配置渲染、编排流程控制

**核心API**:
```
POST   /provision/l3vpn/plan        # L3VPN编排计划
POST   /provision/vpls/plan         # VPLS编排计划
GET    /orders/{orderId}            # 工单查看
POST   /orders/{orderId}/submit     # 提交审批
POST   /orders/{orderId}/approve    # 审批通过
```

**编排流程**:
```
工单参数输入 (endpoint[], bandwidth, SLA)
      ↓
生成业务意图模型 (Business Intent Model)
      ↓
资源池分配与锁定 (VLAN, IP, RD/RT, 端口)
      ↓
生成候选配置 candidate_config
      ↓
调用PCE计算路径 (若需TE)
      ↓
调用deploy-service进行预检查
      ↓
变更单创建 (status=CREATED)
```

**关键特性**:
- 参数验证：VRF唯一性、RT冲突、资源可用性
- 配置模板渲染：使用Jinja2等模板引擎
- 异步任务处理：长流程使用Temporal/Camunda编排

**数据模型**:
- service_orders, service_instances
- service_endpoints, l3vpn_instances, vpls_instances

**依赖**: PostgreSQL, inventory-service, catalog-service, pce-service, deploy-service, Kafka

---

### 2.5 pce-service (路径计算引擎)
**职责**: TE路径计算、显式路径验证、路径仿真

**核心API**:
```
POST   /pce/compute-path            # 计算TE路径
POST   /pce/explicit-path/validate  # 验证显式路径
POST   /pce/path-simulation         # 路径仿真(故障检测)
```

**算法**:
- **CSPF** (Constrained Shortest Path First): 基于bandwidth约束计算主备路径
- **显式路径校验**: 环路检测（DFS）、可达性检测（BFS）
- **路径多样性检查**: 主备路径接点重合度 < 70%

**数据输入**:
- 拓扑图 (from inventory-service via Kafka)
- 隧道约束策略 (from catalog-service)

**关键特性**:
- 跨域CSPF扩展支持(多区域)
- 路径仿真：模拟设备故障，计算替代路径
- 路径可视化

**依赖**: PostgreSQL, inventory-service, Kafka

---

### 2.6 change-service (变更管理)
**职责**: 变更生命周期管理、审批流、发布窗口控制、回滚管理

**核心API**:
```
GET    /changes                     # 变更列表
POST   /changes                     # 创建变更单
GET    /changes/{id}/precheck       # 获取预检查结果
POST   /changes/{id}/approve        # 审批变更
POST   /changes/{id}/submit-publish # 提交发布
POST   /rollbacks                   # 创建回滚单
```

**状态机**:
```
CREATED → PRECHECK_PASSED → APPROVING → APPROVED → SCHEDULED → RUNNING → SUCCESS
                                                                  ↓
                                                              FAILED → ROLLING_BACK → ROLLBACK_SUCCESS
```

**关键特性**:
- 发布窗口控制：检查scheduled_time是否在允许窗口内
- 并发控制：同时发布的变更数受窗口capacity限制
- 高风险变更需双人审批
- 变更间依赖检测：若此变更依赖先前变更，强制执行顺序

**数据模型**:
- change_requests（变更单主表）
- change_approvals（审批记录）
- release_windows（发布窗口配置）

**依赖**: PostgreSQL, inventory-service, audit-service, Kafka

---

### 2.7 deploy-service (配置下发)
**职责**: 预检查、命令编译、下发执行、验收

**核心API**:
```
POST   /precheck                    # 执行预检查
POST   /deployments                 # 开始部署
GET    /deployments/{id}/logs       # 获取执行日志
POST   /deployments/{id}/pause      # 暂停部署
POST   /deployments/{id}/resume     # 继续部署
POST   /deployments/{id}/rollback   # 触发自动回滚
```

**预检查清单**:
1. 语法检查 (YANG树编译)
2. 资源冲突检查
3. 拓扑可达检查
4. 环路检测
5. BGP/ISIS一致性
6. 回滚点可用性
7. 发布窗口检查
8. 审批完整性

**下发流程**:
```
分批策略决策 (CPU load → 每batch最多N设备)
      ↓
按batch迭代:
  ├─ Batch N:
  │  ├─ 连接设备 (NETCONF or SSH)
  │  ├─ 发送命令/配置
  │  ├─ 验证应用 (校验syntax无误)
  │  ├─ Commit配置
  │  └─ 备份config snapshot到MinIO
  │
  └─ 等待operator确认或自动进入下一batch
      ↓
发布完成后自动验证 (接口、BFD、BGP学习、业务路由)
      ↓
验证成功 → status=SUCCESS
验证失败 → 自动回滚
```

**下发适配器**:
- **NETCONF Adapter**: 支持YANG data model, lock/edit-config/unlock
- **SSH CLI Adapter**: 发送命令行, 期望输出匹配

**关键特性**:
- 自动回滚：发布失败或验证失败自动触发
- 幂等性：重复执行同变更单应产生相同结果
- 命令生成追踪：保存所有下发命令便于审查
- 失败隔离：单设备失败不影响其他batch

**数据模型**:
- deploy_jobs（部署任务）
- deploy_tasks（单设备任务）
- config_snapshots（配置备份）

**依赖**: PostgreSQL, inventory-service, change-service, NETCONF/SSH Adapters, MinIO

---

### 2.8 assurance-service (运营保障)
**职责**: 告警汇聚、性能指标、SLA计算、故障根因分析

**核心API**:
```
GET    /alarms                      # 告警列表
GET    /alarms/{id}                 # 告警详情(含根因推荐)
POST   /alarms/{id}/confirm         # 确认告警
POST   /alarms/{id}/close           # 关闭告警
GET    /metrics/query               # 查询性能指标
GET    /sla/dashboard               # SLA达标率看板
```

**数据源**:
- **告警**: SNMP Trap、Syslog、自探测 (BFD状态变化、NQA失败)
- **性能**: Telemetry (grpc)、SNMP轮询、NQA采样
- **SLA**: 基于可用性、延迟、抖动指标自动计算

**关键特性**:
- 告警聚合：相同源的告警15分钟内只保留1条
- 告警升级：30分钟无确认自动升级为P1
- 根因推荐AI：利用时间序列异常检测(Prophet或custom model)推断根因
- SLA日结算：每晚自动计算前一日的SLA%、违约时长等

**数据模型**:
- alarms（告警事件）
- metrics_tunnel_1m, metrics_interface_1m（1分钟粒度）
- sla_results_daily（日结SLA数据）

**依赖**: PostgreSQL, TimescaleDB, OpenSearch, Kafka(告警流)

---

### 2.9 report-service (报表与统计)
**职责**: 多维度报表生成、数据聚合、可追溯性

**核心API**:
```
GET    /reports/operational-metrics # 运营指标报表
GET    /reports/capacity-trends     # 容量趋势报表
GET    /reports/change-audit        # 变更审计报表
POST   /reports/export-excel        # 导出为Excel
```

**报表类型**:
- 开通时长分布、故障恢复时长、变更成功率
- 接口利用率趋势、资源池占用率、业务增长曲线
- 配置变更审计、用户操作日志

**关键特性**:
- 数据追溯：点击图表数据点下钻到原始工单/变更/告警
- 自动化生成：支持定时生成与邮件推送
- 多源聚合：从PostgreSQL、TimescaleDB、OpenSearch多源查询

**依赖**: PostgreSQL, TimescaleDB, OpenSearch, Kafka

---

### 2.10 audit-service (审计与治理)
**职责**: 全链路审计日志、合规检查、审计报告

**核心API**:
```
GET    /audit/logs                  # 审计日志查询
POST   /audit/logs                  # 写入审计日志
GET    /audit/compliance-report     # 合规报告
```

**审计覆盖范围**:
- 登录(何人何时)、配置变更(谁改了什么)
- 审批决策(谁批准了什么)、发布执行(谁执行变更)
- 回滚(谁回滚了什么)
- 权限变更(谁授予了谁新权限)

**关键特性**:
- 不可篡改：日志写入后禁止修改，只能追加
- 哈希链：每条日志含前一条日志的SHA256哈希，防止中间篡改
- 长期归档：90天后日志转移到只读对象存储(MinIO)
- 合规证明生成：可生成"此设备在某时段内的所有配置变更"的完整证明

**数据模型**:
- audit_logs（审计日志主表）

**依赖**: PostgreSQL, MinIO(归档), OpenSearch(全文检索)

---

## 3. 技术选型与基础设施

### 3.1 核心技术栈

| 层 | 技术选择 | 说明 |
|----|---------|------|
| **API网关** | Kong 或 APISIX | 请求路由、速率限制、认证代理 |
| **业务框架** | Spring Boot (Java) 或 FastAPI (Python) | 微服务框架 |
| **关系型DB** | PostgreSQL 13+ | 主事务库，支持JSONB、UUID等 |
| **时序DB** | TimescaleDB 或 VictoriaMetrics | 性能指标时序存储 |
| **缓存** | Redis 6+ | 会话、缓存、分布式锁 |
| **消息队列** | Kafka 2.8+ | 异步编排、事件流 |
| **日志检索** | OpenSearch/Elasticsearch | 审计日志、应用日志检索 |
| **对象存储** | MinIO | 配置快照、报表文件、日志归档 |
| **工作流引擎** | Temporal 或 Camunda | 长流程编排(变更、编排) |
| **容器编排** | Kubernetes | 微服务部署、自动扩缩容 |
| **监控告警** | Prometheus + Grafana | 基础设施监控 |

### 3.2 部署架构

```
┌─────────────────────────────────────────────────────────┐
│               Kubernetes集群 (3+ Master)                │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 微服务容器 (多副本, HPA自动扩缩)                 │  │
│  │  iam × 3, inventory × 3, catalog × 3            │  │
│  │  orch × 3, pce × 2, change × 2, deploy × 2     │  │
│  │  assurance × 2, report × 1, audit × 1          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 数据层 (Pod化或外部服务)                         │  │
│  │  PostgreSQL (HA + Replication)                  │  │
│  │  Redis Cluster (6+ 节点)                        │  │
│  │  Kafka Broker × 5                              │  │
│  │  OpenSearch × 3                                │  │
│  │  MinIO × 4                                     │  │
│  │  TimescaleDB (Standalone 或 HA)                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 存储                                             │  │
│  │  PV: PostgreSQL数据卷 (SSD), MinIO数据卷 (HDD)  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
            │
      ┌─────┴─────┬─────────────┬──────────────┐
      │            │             │              │
 ┌────▼──┐   ┌────▼──┐   ┌────▼────┐   ┌────▼─────┐
 │ Ingress │   │ 负载  │   │Prometheus│  │容器镜像  │
 │ Controller  │均衡器 │   │+Grafana  │  │仓库(Harbor)
 └────────┘   └───────┘   └──────────┘  └──────────┘
```

### 3.3 HA与容灾

- **PostgreSQL**: 主从复制 + 自动failover (Patroni)
- **Redis**: Redis Cluster 或 Sentinel
- **Kafka**: 多broker, replication_factor = 3
- **微服务**: 最少2个副本, Pod Disruption Budget保护
- **跨DC部署**: 可选, 用于地理级别容灾

---

## 4. 数据流与集成

### 4.1 工单开通流数据流

```
用户Web UI (P15/P16)
     │
     ├─→ iam-service (验证权限)
     │
     ├─→ orchestration-service (处理编排)
     │   │
     │   ├─→ inventory-service (资源冲突检查)
     │   │
     │   ├─→ pce-service (计算TE路径)
     │   │
     │   ├─→ catalog-service (查询模板)
     │   │
     │   └─→ deploy-service (预检查)
     │
     ├─→ change-service (创建变更单)
     │
     └─→ PostgreSQL (持久化)
```

### 4.2 配置下发数据流

```
change-service (变更单status=APPROVED)
     │
     ├─→ deploy-service (执行预检查 + 下发)
     │   │
     │   ├─[NETCONF Adapter]→ 设备 (NETCONF)
     │   │                      或
     │   └─[SSH CLI Adapter]→ 设备 (SSH/Telnet)
     │
     ├─→ inventory-service (更新config_snapshot)
     │   │
     │   └─→ MinIO (备份配置文件)
     │
     └─→ assurance-service (自动验证: BFD/BGP/NQA)
         │
         └─→ change-service (更新status=SUCCESS/FAILED)
```

### 4.3 告警采集与处理数据流

```
网络设备 (SNMP Trap / Syslog)
     │
     ├─(Trap Handler)→ assurance-service
     │
     ├─→ PostgreSQL (alarms表)
     │
     ├─→ Kafka (告警流) ──→ OpenSearch (全文索引)
     │
     └─→ 根因推荐 + 自动处置建议
         │
         └─→ 回写工单(可选自愈)
```

---

## 5. 非功能需求实现

### 5.1 性能优化

| 指标 | 优化方案 |
|------|---------|
| 列表页 P95 < 2秒 | 分区表、索引、Redis缓存、分页 |
| 拓扑加载 < 5秒 | 缓存拓扑图、WebSocket推送增量更新 |
| 搜索响应 < 1秒 | OpenSearch全文索引 + 缓存热点 |
| API吞吐量 > 1000 req/s | Kong网关限流、微服务扩缩容 |

### 5.2 高可用设计

| 组件 | 可用性目标 | 实现方案 |
|------|-----------|---------|
| API网关 | 99.99% | 多节点 + 负载均衡器 |
| 微服务 | 99.9% | 最少2副本 + HPA |
| 数据库 | 99.95% | 主从 + 自动failover |
| 外部服务 | 用户自维 | 定期巡检、超时重试 |

### 5.3 安全实现

| 安全需求 | 实现方案 |
|---------|---------|
| 传输层安全 | TLS 1.2+ (Kong支持) |
| 认证 | JWT + MFA + SSO |
| 授权 | RBAC + ABAC (细粒度) |
| 审计不可篡改 | 数据库约束 + 哈希链 + 只读归档 |
| 密钥管理 | Vault 或 K8s Secrets |
| 数据加密 | 敏感字段数据库加密(AES) |

---

## 6. 开发与测试规范

### 6.1 代码结构

```
sdn-controller/
├── api-gateway/          # Kong配置与插件
├── services/
│   ├── iam-service/
│   ├── inventory-service/
│   ├── catalog-service/
│   ├── orchestration-service/
│   ├── pce-service/
│   ├── change-service/
│   ├── deploy-service/
│   ├── assurance-service/
│   ├── report-service/
│   └── audit-service/
├── adapters/
│   ├── netconf-adapter/
│   ├── ssh-cli-adapter/
│   └── snmp-telemetry-collector/
├── shared/               # 共享库(模型、工具类)
├── k8s/                  # Kubernetes manifests & Helm charts
├── db/                   # 数据库初始化脚本 & migrations
├── tests/                # 集成测试、场景测试
└── docs/                 # 开发文档、API文档
```

### 6.2 提交标准

```
Commit Message格式:
  feat(module): 功能描述
  fix(module): 缺陷修复
  docs: 文档更新
  test: 测试用例
  refactor: 重构

Pull Request:
  - 单个功能原子化,最多涉及3个服务
  - 必须包含单元测试 + 集成测试
  - 需2人review通过
  - CI自动化: lint + test + build
```

---

**文档版本**: v1.0  
**最后更新**: 2026-04-07
