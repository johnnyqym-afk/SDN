# SDN 控制器 v1.0

> 将现网 L3VPN / VPLS / MPLS TE / BFD/NQA 业务从手工命令行升级为  
> **模板化 + 流程化 + 可回滚** 的自动化编排与运维平台。

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + Vite + React Router v6 |
| 样式 | CSS Variables（深色主题，JetBrains Mono / Noto Sans SC） |
| 后端 | FastAPI (Python 3.11) + SQLAlchemy 2.0 Async |
| 数据库 | PostgreSQL 15 + TimescaleDB（时序指标） |
| 缓存/锁 | Redis 7 |
| 认证 | JWT (HS256) + MFA (TOTP) |
| 容器 | Docker Compose |

---

## 快速启动

### 前置条件
- Docker >= 24.x
- Docker Compose >= 2.x

### 一键启动

```bash
git clone <repo>
cd sdn-project
docker compose up -d
```

服务启动后访问：
- 前端：http://localhost:3000
- 后端 API 文档：http://localhost:8000/docs
- ReDoc：http://localhost:8000/redoc

### 默认账号

| 用户名 | 密码 | 角色 |
|---|---|---|
| admin | Admin@2026 | SuperAdmin |
| alice | Alice@2026 | ProvisionEngineer |
| approver1 | Approver@2026 | Approver |
| noc1 | Noc@2026 | NOCOperator |

---

## 本地开发（无 Docker）

### 后端

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 填写 DATABASE_URL 等

# 初始化数据库
alembic upgrade head
python -m app.seed  # 插入初始数据

# 启动
uvicorn app.main:app --reload --port 8000
```

### 前端

```bash
cd frontend
npm install
cp .env.example .env.local
# 编辑 VITE_API_BASE_URL=http://localhost:8000

npm run dev
```

---

## 工程结构

```
sdn-project/
├── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── api/           # Axios 封装 + API 模块
│   │   ├── components/    # 通用组件 (Table, Modal, Badge…)
│   │   ├── pages/         # 32个页面组件
│   │   ├── hooks/         # useAuth, useWebSocket…
│   │   └── utils/         # 格式化、常量、路由
│   ├── index.html
│   └── vite.config.js
└── backend/
    ├── app/
    │   ├── main.py         # FastAPI 入口
    │   ├── core/           # 配置、安全、数据库
    │   ├── api/            # 路由：auth/orders/services/changes…
    │   ├── models/         # SQLAlchemy ORM 模型（完整DDL）
    │   ├── schemas/        # Pydantic v2 请求/响应模型
    │   └── services/       # 业务逻辑层
    ├── migrations/         # Alembic + init.sql
    └── requirements.txt
```

---

## API 概览

完整 OpenAPI 文档见 http://localhost:8000/docs

| 前缀 | 说明 |
|---|---|
| `/auth/*` | 登录、刷新Token、登出 |
| `/api/v1/dashboard/*` | 首页汇总数据 |
| `/api/v1/orders/*` | 工单 CRUD + 审批 |
| `/api/v1/services/*` | 服务实例 + L3VPN/VPLS 编排 |
| `/api/v1/changes/*` | 变更单 CRUD + 审批 |
| `/api/v1/deployments/*` | 发布控制台 + 回滚 |
| `/api/v1/inventory/*` | 设备 + 接口 + 拓扑 |
| `/api/v1/pools/*` | 资源池（VLAN/IP/RD/RT）|
| `/api/v1/alarms/*` | 告警管理 |
| `/api/v1/metrics/*` | 性能指标查询 |
| `/api/v1/sla/*` | SLA 看板 + 违约明细 |
| `/api/v1/policies/*` | TE/QoS/SLA 模板 |
| `/api/v1/audit/*` | 审计日志（只读）|
| `/api/v1/system/*` | 系统配置 + 用户权限 |

---

## 里程碑

| 阶段 | 周期 | 目标 |
|---|---|---|
| M1 | 第1-4周 | 设备纳管、拓扑、资源池 |
| M2 | 第5-12周 | L3VPN/VPLS 编排、变更发布 |
| M3 | 第13-20周 | SLA 闭环、告警自愈、报表 |
