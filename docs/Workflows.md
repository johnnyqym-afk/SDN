# SDN 控制器 - 工作流与状态机设计

## 1. 服务生命周期状态机

### 1.1 状态转移图

```
                    ┌─────────────────────────────────────────────┐
                    │                                               │
                    ▼                                               │
[工单] ◄────────── [DRAFT] ◄──────────────┐                       │
工单草稿            (用户编辑中)          │ 审批驳回             │
                        │                  │                       │
                        │ 提交审批         │                      │
                        ▼                  │                       │
                   [SUBMITTED]             │                       │
              (等待审批人审批)             │                       │
                        │                  │                       │
                ┌───────┴─────────┐       │                       │
                │                 │       │                       │
         驳回   ▼         批准    ▼       │                       │
          ┌────────┐    ┌────────────┐    │                       │
          │ REJECT │    │  APPROVED  │────┘                       │
          └────────┘    └────┬───────┘                            │
                             │                                      │
                      确定开通窗口                                  │
                             │                                      │
                             ▼                                      │
                      [PLANNING]                                   │
                  (等待发布窗口)                                    │
                             │                                      │
              release_window.start_time                            │
                             │                                      │
                             ▼                                      │
                      [DEPLOYING]                                  │
                   (配置下发中)                                     │
                             │                                      │
                ┌────────────┴────────────┐                        │
                │                         │                        │
                ▼ 发布成功 & 验证通过     ▼ 发布失败 or 验证失败  │
            [ACTIVE]                   [FAILED]                    │
         (业务正常运行)            (需要人工介入)                 │
                │                         │                        │
         ┌──────┴───────────────┐        │                        │
         │                      │        │                        │
    用户扩容调整 │          用户撤退网 │                        │
         │                      │        │                        │
         ▼                      ▼        │                        │
    [CHANGING]           [TERMINATING]   │                        │
   (变更中)              (退网中)       │                        │
         │                      │        │                        │
         ▼                      ▼        │                        │
    [ACTIVE] ──────────► [TERMINATED]   │                        │
         │                (已退网)       │                        │
         │                               │                        │
         └───────────────────────────────┴────────────────────────┘
            (可重新将TERMINATED服务恢复为新工单)
```

### 1.2 各状态定义

| 状态 | 含义 | 进入触发 | 可执行操作 | 出口 |
|------|------|---------|---------|------|
| DRAFT | 草稿 | 工单创建 | 编辑、提交审批、删除 | 提交 → SUBMITTED |
| SUBMITTED | 待审批 | 工单提交 | 无(等待审批人) | 批准 → APPROVED 或 驳回 → DRAFT |
| APPROVED | 已批准 | 审批通过 | 规划发布窗口、查看 | 窗口确定 → PLANNING |
| PLANNING | 规划中 | 窗口确定 | 查看、等待 | 窗口启动 → DEPLOYING |
| DEPLOYING | 下发中 | 窗口启动发布 | 监控日志、暂停/继续 | 成功 → ACTIVE 或 失败 → FAILED |
| ACTIVE | 激活 | 发布成功 | 查看配置、提交变更(扩容/迁移)、退网申请 | 变更 → CHANGING 或 退网 → TERMINATING |
| CHANGING | 变更中 | 创建变更工单 | 等待、监控 | 变更成功 → ACTIVE 或 失败回滚 → ACTIVE |
| TERMINATING | 退网中 | 撤退申请 | 监控日志 | 成功 → TERMINATED |
| TERMINATED | 已退网 | 退网完成 | 只读查看、审计追溯 | 无(最终态) |
| FAILED | 失败 | 部署/验证失败 | 手工审查、重新发布或回滚 | 手工恢复或回滚 |

---

## 2. 变更生命周期状态机 (变更单)

### 2.1 状态转移图

```
                                     ┌─────────────────────────────────┐
                                     │                                  │
                                     │                驳回              │
                    ┌────────────────┴────────────┐                    │
                    │                             │                    │
                    ▼                             ▼                    │
[变更单创建] → [CREATED] ──预检查──► [PRECHECK_PASSED]              │
           (草稿)  参数校验不通过 ↓ 或 参数修改后重试                │
                       │              └────────────────┐               │
                       │                               │               │
                       │ (编辑参数后重新预检查)        │               │
                       └───────────────────────────────┘               │
                                     │                                  │
                         提交审批    │                                  │
                                     ▼                                  │
                              [APPROVING]                              │
                         (等待审批人审批)                              │
                                     │                                  │
                        ┌────────────┴─────────┐                       │
                        │                      │                       │
                   批准 ▼           驳回/拒绝  │                       │
                   ┌─────────┐    ┌──────────────┐                     │
                   │ APPROVED│    │  REJECTED    │                     │
                   └────┬────┘    └──────┬───────┘                     │
                        │                │                             │
                        │                │ (创建新变更单)             │
                        │                └─────────────────────────────┘
                        │
              计划发布窗口时间
                        │
                        ▼
                   [SCHEDULED]
            (等待发布窗口开启)
                        │
              release_window.start_time
                        │
                        ▼
                    [RUNNING]
                  (发布执行中)
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼ 发布成功 & 验证通过   ▼ 发布失败 or 验证失败
        [SUCCESS]              [FAILED]
       (发布成功)        (可选自动回滚)
            │                       │
            ▼ (可选手动回滚)        ▼ 手工回滚或自动回滚
        [查看历史] ◄─────────── [ROLLING_BACK]
                                    │
                        ┌───────────┴────────┐
                        │                    │
                        ▼                    ▼
                [ROLLBACK_SUCCESS]   [ROLLBACK_FAILED]
                  (回滚成功)          (需人工干预)
```

### 2.2 各状态定义

| 状态 | 含义 | 进入触发 | 可执行操作 | 前置条件 |
|------|------|---------|---------|---------|
| CREATED | 草稿 | 变更单创建 | 编辑参数、预检查、删除 | - |
| PRECHECK_PASSED | 预检查通过 | 预检查全部通过 | 提交审批、查看预检查详情 | 预检查通过 |
| APPROVING | 审批中 | 提交审批 | 等待、撤回 | PRECHECK_PASSED |
| APPROVED | 已批准 | 所有审批通过 | 规划发布、查看审批流 | 所有审批人批准 |
| SCHEDULED | 已调度 | 发布窗口确定 | 监控、发布、取消 | APPROVED |
| RUNNING | 执行中 | 点击发布按钮 | 监控日志、暂停、停止并回滚 | SCHEDULED |
| SUCCESS | 成功 | 发布完成 & 验证通过 | 查看、创建回滚单 | 发布成功 |
| FAILED | 失败 | 发布失败 或 验证失败 | 查看日志、重新发布、自动/手动回滚 | 发布/验证异常 |
| ROLLING_BACK | 回滚中 | 触发回滚 | 监控回滚日志 | 发布成功 |
| ROLLBACK_SUCCESS | 回滚成功 | 回滚完成 & 验证通过 | 查看回滚日志 | 回滚成功 |
| ROLLBACK_FAILED | 回滚失败 | 回滚执行失败 | 查看日志、手工干预 | 回滚异常 |

---

## 3. 批准工作流 (Approval Workflow)

### 3.1 单级审批流程

```
工单/变更单创建 → 确定审批人清单 → 逐人审批 → 所有审批通过 → 流转至下一状态
```

**规则**:
- 所有 required=True 的审批人必须批准
- 单个审批人可批准、驳回或延期
- 驳回返回至CREATED状态,申请人可修改后重新提交

### 3.2 多级审批流程 (高风险变更)

```
Level 1: Owner → L2_Approver (Approver角色) 
         ↓ (批准)
Level 2: L2_Approver → L3_Approver (NetworkArchitect角色)
         ↓ (批准)
APPROVED → 流转至下一状态

任一级驳回 → 返回CREATED
```

---

## 4. 发布流程 (Deployment Workflow)

### 4.1 分批发布流程

```
变更状态:APPROVED + 当前时间 ∈ release_window
         │
         ├─ operator点击"发布"按钮
         │
         ├─ 自动分批决策 (基于CPU load, 设备个数等)
         │  Batch 1: [PE1, PE2, PE3]  (5分钟执行)
         │  Batch 2: [CE1, CE2]       (3分钟执行)
         │  Batch 3: [RR1]            (2分钟执行)
         │
         ├─ 状态变为: RUNNING
         │
         ├─ Batch 1处理:
         │  ├─ 并发连接每台设备 (NETCONF or SSH)
         │  ├─ 逐设备下发命令 (使用事务)
         │  ├─ 验证配置语法
         │  ├─ Commit配置变更
         │  ├─ 备份post-change config snapshot
         │  └─ 单设备失败 → 自动恢复备份配置
         │
         ├─ Batch 1完成后 → 自动进入Batch 2 (或等待operator确认)
         │
         ├─ ...所有batch完成
         │
         ├─ 自动验证阶段:
         │  ├─ 检查接口状态 (admin/oper state)
         │  ├─ 检查BFD邻接 (若有)
         │  ├─ 检查BGP/ISIS路由学习
         │  ├─ 检查业务路由生效 (NQA探针测试)
         │  └─ 若验证失败 → 自动触发回滚
         │
         ├─ 所有验证通过 → 状态变为: SUCCESS
         │
         └─ (可选) operator可随时点击"停止并回滚"中断发布
```

### 4.2 执行日志示例

```
[2026-04-21 22:00:00 UTC] 开始Batch 1,2台设备,预计耗时3分钟
[2026-04-21 22:00:05 UTC] PE1: 连接SSH...
[2026-04-21 22:00:06 UTC] PE1: auth success
[2026-04-21 22:00:07 UTC] PE1: entering system-view
[2026-04-21 22:00:08 UTC] PE1: sending 50 commands...
[2026-04-21 22:00:25 UTC] PE1: all commands sent, saving config...
[2026-04-21 22:00:27 UTC] PE1: SUCCESS (took 27s, 50 commands)
[2026-04-21 22:00:05 UTC] PE2: 连接NETCONF...
[2026-04-21 22:00:06 UTC] PE2: session established
[2026-04-21 22:00:08 UTC] PE2: locking candidate db...
[2026-04-21 22:00:10 UTC] PE2: sending XML config...
[2026-04-21 22:00:15 UTC] PE2: validating...
[2026-04-21 22:00:17 UTC] PE2: committing...
[2026-04-21 22:00:19 UTC] PE2: SUCCESS (took 19s)
[2026-04-21 22:00:30 UTC] Batch 1 完成: 2/2 devices success
[2026-04-21 22:00:30 UTC] 等待operator确认进入Batch 2... (可配置为自动)
[2026-04-21 22:00:35 UTC] operator 确认继续 → 开始Batch 2
...
[2026-04-21 22:10:00 UTC] 所有batch完成
[2026-04-21 22:10:05 UTC] 启动验证阶段...
[2026-04-21 22:10:10 UTC] 检查接口状态: PE1_GE0/0/0 UP ✓
[2026-04-21 22:10:11 UTC] 检查BFD邻接: PE1-PE2 UP ✓
[2026-04-21 22:10:15 UTC] 检查BGP学习: PE1 learned 10 routes from PE2 ✓
[2026-04-21 22:10:20 UTC] 业务路由测试: ping 10.100.1.1 -c 5, 0% loss ✓
[2026-04-21 22:10:25 UTC] 验证完成: 所有检查通过 ✓
[2026-04-21 22:10:26 UTC] change_status = SUCCESS
```

---

## 5. 回滚流程 (Rollback Workflow)

### 5.1 自动回滚 (发布失败或验证失败)

```
发布失败 或 验证失败 
         │
         ├─ 标记deploy_job为FAILED
         │  
         ├─ 若配置auto_rollback=true:
         │  ├─ 自动读取pre-change config_snapshot
         │  ├─ 逆向生成恢复命令
         │  ├─ 倒序对已发布的batch进行恢复 (最后发布的batch先恢复)
         │  ├─ 逐设备下发恢复配置
         │  └─ 验证恢复成功(接口、邻接、路由)
         │
         └─ 状态变为: ROLLBACK_SUCCESS 或 ROLLBACK_FAILED
```

### 5.2 手工回滚 (发布后24小时内)

```
operator 在"回滚中心"页(P27)选择回滚方式:
         │
         ├─ 方式1: 一键回滚
         │  ├─ 自动选择最近的SUCCESS deploy_job
         │  ├─ 读取pre-change snapshot
         │  ├─ 生成回滚变更单 (change_type=ROLLBACK)
         │  ├─ 快速审批路由(无需走全新工单流程)
         │  └─ 立即发布
         │
         ├─ 方式2: 按batch选择性回滚
         │  ├─ 选择回滚Batch 1~2 (保留Batch 3)
         │  ├─ 倒序对选定batch恢复
         │  └─ 验证后标记为成功
         │
         └─ 方式3: 手工补偿
            ├─ operator进入rescue mode
            ├─ 手工输入恢复命令
            ├─ 逐设备执行
            └─ 完成后标记MANUAL_INTERVENTION
```

**约束**:
- 仅在发布后24小时内支持自动回滚
- 超过24小时需通过提交新的变更单(手工逆向修改)
- 若此服务后续有新变更依赖当前变更,回滚前需同时回滚依赖变更

---

## 6. 告警自动处置流程 (Auto Remediation)

### 6.1 告警触发 → 根因推荐 → 自动处置

```
告警事件到达 (SNMP Trap / Syslog / BFD状态变化)
         │
         ├─ assurance-service 摄入告警
         │  ├─ 去重聚合 (同源15分钟内只保留1条)
         │  ├─ 关联业务 (查看哪些service经过故障链路)
         │  ├─ 计算影响范围
         │  └─ 存入alarms表
         │
         ├─ 触发根因推荐引擎
         │  ├─ 分析前1小时的时间序列告警
         │  │  (如:设备A CPU飙升 → 链路B拥塞 → 路由C抖动)
         │  ├─ AI模型推断root cause
         │  └─ 生成处置建议
         │
         ├─ 若告警级别=P1 且 有自动处置规则:
         │  ├─ 规则示例:
         │  │  IF link_down AND peer_bgp_down THEN auto_switch_to_backup
         │  │  IF cpu_high AND memory_available THEN restart_process
         │  │  IF dns_timeout THEN failover_to_backup_dns
         │  │
         │  ├─ 触发对应处置动作 (可能是智能路由调整、进程重启等)
         │  ├─ 记录处置操作日志
         │  └─ 回写工单状态(变更为CHANGING → auto remediation → ACTIVE)
         │
         └─ NOC operator 可查看P05告警详情,了解根因与处置建议
            并决定是否手工干预或让自动处置继续进行
```

### 6.2 自动处置规则示例

```json
{
  "alarm_code": "LINK_DOWN",
  "service_type": ["L3VPN", "VPLS"],
  "trigger_rule": {
    "metric": "link_oper_state",
    "value": "DOWN",
    "duration_sec": 30
  },
  "auto_actions": [
    {
      "priority": 1,
      "action": "switch_to_backup_path",
      "params": {
        "service_id": "{service_id}",
        "tunnel_mode": "backup_activation"
      },
      "timeout_sec": 60
    },
    {
      "priority": 2,
      "action": "create_incident_ticket",
      "params": {
        "severity": "P1",
        "owner": "noc_on_duty"
      }
    }
  ],
  "notification": {
    "channels": ["email", "slack", "sms"],
    "recipients": ["noc-team@company.com"]
  }
}
```

---

## 7. 核心业务流程 (BPMN 概览)

### 7.1 L3VPN 开通端到端业务流程

```
工单申请 (P07)
  ├─ SUBMIT 工单
  │    ↓
  ├─ NetworkArchitect 审批
  │    ↓
  ├─ 确认批准后自动触发编排
  │    ├─ orchestration-service 生成意图模型
  │    ├─ 资源池分配 (VLAN, IP, RD/RT, 端口)
  │    ├─ 调用PCE计算TE路径
  │    ├─ 生成candidate config
  │    └─ 创建 change_request (状态=CREATED)
  │
  ├─ ProvisionEngineer 准备变更单 (P24)
  │    ├─ 查看配置对比 (diff view)
  │    ├─ 执行预检查 (P25)
  │    │   ├─ 语法、冲突、可达性、环路检测
  │    │   ├─ VRF/VSI RT一致性
  │    │   ├─ 发布窗口检查
  │    │   └─ 审批完整性检查
  │    │
  │    ├─ 若预检查通过 → 提交审批
  │    │    ↓
  │
  ├─ Approver 审批变更单 (P24)
  │    ├─ 查看影响评估
  │    ├─ 查看审批流
  │    ├─ 批准或驳回
  │    └─ 若批准 → status=APPROVED
  │
  ├─ 等待发布窗口 (计划时间到达)
  │
  ├─ ProvisionEngineer 发起发布 (P26)
  │    ├─ 监控分批下发日志
  │    ├─ 若单设备失败 → 自动恢复该设备,继续其他batch
  │    ├─ 所有batch完成后启动验证
  │    │   ├─ 检查接口状态
  │    │   ├─ 检查BFD邻接
  │    │   ├─ 检查BGP学习
  │    │   └─ 业务端到端测试 (ICMP/TCP)
  │    │
  │    ├─ 验证通过 → status=SUCCESS
  │    │   ├─ 服务状态变为 ACTIVE
  │    │   ├─ 通知客户业务已开通
  │    │   └─ SLA计时开始
  │    │
  │    └─ 验证失败 → 自动回滚 (P27)
  │        ├─ 恢复pre-change config
  │        ├─ 删除之前创建的VRF/VLAN等
  │        └─ 状态变为 ROLLBACK_SUCCESS,工单变为 FAILED
  │
  └─ NOC 巡检与SLA监控 (P28/P29)
       ├─ 接口流量、时延、抖动监控
       ├─ BFD邻接、BGP路由状态巡检
       ├─ 告警自动关联此业务
       ├─ SLA日结算
       └─ 违约时自动通知客户与财务
```

---

**文档版本**: v1.0  
**最后更新**: 2026-04-07
