# SDN 控制器产品设计项目

## 项目简介

这是一份完整的 **SDN控制器产品设计说明书 v1.0** 的结构化文档集。旨在将现网的L3VPN、VPLS、MPLS TE、BFD/NQA业务从手工命令行升级为 **模板化+流程化+可回滚** 的自动化编排与运维平台。

### 核心目标
1. ✓ 建立统一的资源模型,避免命名漂移与重复分配
2. ✓ 端到端的变更闭环 (预检查→发布→验证→回滚)
3. ✓ SLA保障与智能告警自愈
4. ✓ 完整的审计追溯与合规支持

---

## 📁 文档导航

### 核心文档

| 文档 | 用途 | 阅读对象 |
|------|------|---------|
| **[PRD_v1.0.md](docs/PRD_v1.0.md)** | 产品需求文档 - 整体概览 | 产品/管理 |
| **[Page_Design_Details.md](docs/Page_Design_Details.md)** | 32个页面的详细设计 | 产品/UX设计 |
| **[Architecture.md](docs/Architecture.md)** | 系统架构与微服务设计 | 技术架构师 |
| **[DataModel_Design.md](docs/DataModel_Design.md)** | 完整的E-R模型与DDL | 数据库设计师 |
| **[API_Design.md](docs/API_Design.md)** | OpenAPI 3.0 规范 | 后端工程师 |
| **[Workflows.md](docs/Workflows.md)** | 业务流程与状态机 | 产品/流程设计 |
| **[Adapter_Spec.md](docs/Adapter_Spec.md)** | 南向适配器规范 | 网络工程师 |
| **[UAT_TestCases.md](docs/UAT_TestCases.md)** | 验收测试用例框架 | QA工程师 |
| **[Roadmap.md](docs/Roadmap.md)** | 上线里程碑与交付计划 | 项目经理 |

---

## 🎯 产品范围

### 覆盖的业务类型
- ✅ **L3VPN** - 企业网多点互联 (原MPLS L3VPN)
- ✅ **VPLS/VPWS** - 二层域拉通 (原以太网虚拟专线)
- ✅ **TE隧道策略** - 基于约束的路径计算与倒换
- ✅ **QoS限速** - 承诺带宽与高级队列管理
- ✅ **BFD/NQA探测** - 业务端点可用性监测

### 覆盖的生命周期
- ✅ 新开 - 从零建立业务
- ✅ 扩容 - 增加带宽、增加站点
- ✅ 降速 - 减少带宽
- ✅ 迁移 - 迁移到新链路
- ✅ 退网 - 彻底删除业务
- ✅ 回滚 - 发布失败自动回滚,手工回滚

---

## 🏗️ 架构快览

### 微服务划分 (10个核心服务)
```
iam-service           认证、RBAC、MFA
inventory-service     设备纳管、拓扑发现、资源池
catalog-service       模板、策略、版本化管理
orchestration-service 工单编排、意图模型
pce-service          路径计算、约束求解
change-service       变更管理、审批流
deploy-service       配置下发、预检查、验证
assurance-service    告警、SLA、性能指标
report-service       多维报表、数据聚合
audit-service        审计日志、合规报告
```

### 技术选型
| 组件 | 选择 |
|------|-----|
| API网关 | Kong / APISIX |
| 业务框架 | Spring Boot / FastAPI |
| 主数据库 | PostgreSQL 13+ |
| 时序数据库 | TimescaleDB / VictoriaMetrics |
| 缓存/锁 | Redis 6+ |
| 消息队列 | Kafka 2.8+ |
| 日志检索 | OpenSearch/Elasticsearch |
| 对象存储 | MinIO |
| 工作流引擎 | Temporal / Camunda |
| 容器编排 | Kubernetes |

---

## 📋 页面设计 (32页)

### 核心用户界面
```
P01  登录页              P17  服务实例列表
P02  首页工作台          P18  服务实例详情
P03  全局搜索            P19  TE隧道策略库
P04  告警中心列表        P20  显式路径编辑器
P05  告警详情            P21  QoS模板中心
P06  工单列表            P22  SLA模板中心
P07  工单详情            P23  变更单列表
P08  设备列表            P24  变更单详情
P09  设备详情            P25  预检查仿真页
P10  拓扑地图            P26  发布控制台
P11  接口资源池          P27  回滚中心
P12  IP地址池            P28  性能监控页
P13  VLAN/标签池        P29  SLA看板
P14  服务目录            P30  报表中心
P15  L3VPN开通向导       P31  审计日志
P16  VPLS开通向导        P32  系统管理
```

---

## 🔄 核心业务流程

### L3VPN 端到端开通流程

```
客户申请工单 (P07)
    ↓
NetworkArchitect 审批工单 → 自动触发编排
    ↓
orchestration-service:
  ├─ 生成业务意图模型
  ├─ 分配资源 (VLAN, IP, RD/RT, 端口)
  ├─ 调用PCE计算路径
  └─ 生成变更单 (status=CREATED)
    ↓
ProvisionEngineer 准备变更单 (P24)
  ├─ 查看配置diff
  ├─ 执行预检查 (P25)
  │  └─ 6项检查: 语法、冲突、可达、环路、BGP一致性、回滚点
  └─ 提交审批
    ↓
Approver 审批变更单 → 批准
    ↓
等待发布窗口 opened
    ↓
ProvisionEngineer 发起发布 (P26)
  ├─ 分批下发NETCONF/CLI配置
  ├─ 单设备失败自动恢复
  └─ 批次完成后自动验证
    ↓
自动验证:
  ├─ 接口状态检查
  ├─ BFD邻接检查
  ├─ BGP路由学习验证
  └─ 业务end-to-end测试
    ↓
验证通过 → 服务状态变为 ACTIVE
验证失败 → 自动回滚 (P27)
```

---

## 📊 主要数据模型

### 核心表设计
- **IAM**: users, roles, user_roles, permissions
- **Inventory**: devices, interfaces, links, config_snapshots
- **Resources**: resource_pools, pool_allocations
- **Services**: service_orders, service_instances, service_endpoints
- **Business**: l3vpn_instances, vpls_instances
- **Policies**: tunnel_policies, explicit_paths, qos_profiles, sla_profiles
- **Changes**: change_requests, change_approvals, deploy_jobs, deploy_tasks, rollback_jobs
- **Operations**: alarms, metrics_*_1m, sla_results_daily
- **Audit**: audit_logs (不可篡改, 哈希链保护)

### 关键特性
✓ 全表事务支持 (PostgreSQL ACID)  
✓ 时序数据分片 (TimescaleDB自动分区)  
✓ 审计日志hash chain (防篡改)  
✓ 资源并发锁 (Redis分布式锁)  
✓ 配置版本管理 (MinIO快照存储)  

---

## 🚀 上线计划

### 三阶段交付

| 阶段 | 周期 | 目标 | 交付 |
|------|------|------|------|
| **M1** | 4周 | 资源纳管与基础 | 设备管理、拓扑、资源池 |
| **M2** | 8周 | 业务开通与变更 | L3VPN/VPLS编排、预检查、发布 |
| **M3** | 12周 | SLA与自动化 | 告警、SLA计算、报表、自愈 |

### 验收标准
- ✅ 发布成功率 >= 98%
- ✅ 自动回滚成功率 >= 99%
- ✅ 关键列表页响应 P95 < 2秒
- ✅ 拓扑加载 < 5秒
- ✅ 系统可用性 >= 99.5%
- ✅ 审计零缺失

---

## 📖 快速开始

### 文档阅读顺序

**产品人员**:
1. 阅读 [PRD_v1.0.md](docs/PRD_v1.0.md) (30分钟) - 整体理解
2. 浏览 [Page_Design_Details.md](docs/Page_Design_Details.md) (2小时) - 交互细节
3. 输入 [Workflows.md](docs/Workflows.md) (1小时) - 业务流程

**技术人员**:
1. 阅读 [Architecture.md](docs/Architecture.md) (1小时) - 系统设计
2. 研习 [DataModel_Design.md](docs/DataModel_Design.md) (2小时) - 数据模型
3. 实现 [API_Design.md](docs/API_Design.md) (3小时) - API接口
4. 调试 [Adapter_Spec.md](docs/Adapter_Spec.md) (2小时) - 南向适配

**QA/测试**:
1. 浏览 [UAT_TestCases.md](docs/UAT_TestCases.md) (1小时) - 测试框架
2. 执行 [Roadmap.md](docs/Roadmap.md) 中各阶段的测试用例

---

## 👥 用户角色

| 角色 | 职责 | 权限 |
|------|------|------|
| **SuperAdmin** | 系统配置、权限、连接器 | 最高权限, 审计覆盖 |
| **NetworkArchitect** | 模板设计、路径策略、基线 | 模板发布、策略配置 |
| **ProvisionEngineer** | 工单编排、变更执行 | 业务开通、发布控制 |
| **NOCOperator** | 告警处理、性能巡检 | 告警确认、数据查询 |
| **Approver** | 工单/变更审批 | 审批决策、窗口管理 |
| **Auditor** | 审计查询、合规报表 | 审计日志查询(只读) |

---

## 🔒 安全与合规

✅ **认证**: JWT + MFA (TOTP/邮件OTP) + SSO (SAML/OIDC)  
✅ **授权**: RBAC + ABAC (细粒度权限)  
✅ **加密**: TLS 1.2+传输 + AES-256字段加密 + Vault密钥管理  
✅ **审计**: 全链路日志 + hash chain不可篡改 + 长期归档  
✅ **合规**: 操作员最小权限 + 变更双人审批 + SLA违约可溯源  

---

## 📞 联系方式

| 角色 | 联系 |
|------|------|
| 产品经理 | product@company.com |
| 技术架构师 | architect@company.com |
| 项目经理 | pm@company.com |
| 一线支持 | support@company.com |

---

## 许可证

本文档属于 **公司机密** 资料,仅用于项目开发。

**文档版本**: v1.0  
**最后更新**: 2026-04-07  
**维护人**: SDN项目组