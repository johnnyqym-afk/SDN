-- SDN Controller - Database Initialization
-- PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─────────────────────────────────────────────────────
-- Seed: Roles
-- ─────────────────────────────────────────────────────

INSERT INTO roles (id, role_code, role_name, description) VALUES
  (gen_random_uuid(), 'SUPER_ADMIN',          'Super Admin',           '系统最高权限'),
  (gen_random_uuid(), 'NETWORK_ARCHITECT',    'Network Architect',     '网络架构师'),
  (gen_random_uuid(), 'PROVISION_ENGINEER',   'Provision Engineer',    '开通工程师'),
  (gen_random_uuid(), 'NOC_OPERATOR',         'NOC Operator',          'NOC操作员'),
  (gen_random_uuid(), 'APPROVER',             'Approver',              '审批人'),
  (gen_random_uuid(), 'AUDITOR',              'Auditor',               '审计员')
ON CONFLICT (role_code) DO NOTHING;

-- ─────────────────────────────────────────────────────
-- Seed: Users (password = bcrypt of "Admin@2026" etc.)
-- Run `python -m app.seed` to regenerate hashes
-- ─────────────────────────────────────────────────────

-- admin / Admin@2026
INSERT INTO users (id, username, email, password_hash, status, mfa_enabled) VALUES
  (gen_random_uuid(), 'admin',     'admin@sdn.local',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbFNsGpMm', 'ACTIVE', false),
  (gen_random_uuid(), 'alice',     'alice@sdn.local',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbFNsGpMm', 'ACTIVE', false),
  (gen_random_uuid(), 'approver1', 'approver1@sdn.local', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbFNsGpMm', 'ACTIVE', false),
  (gen_random_uuid(), 'noc1',      'noc1@sdn.local',      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4tbFNsGpMm', 'ACTIVE', false)
ON CONFLICT (username) DO NOTHING;

-- Assign roles
INSERT INTO user_roles (id, user_id, role_id)
SELECT gen_random_uuid(), u.id, r.id
FROM users u, roles r
WHERE (u.username = 'admin'     AND r.role_code = 'SUPER_ADMIN')
   OR (u.username = 'alice'     AND r.role_code = 'PROVISION_ENGINEER')
   OR (u.username = 'approver1' AND r.role_code = 'APPROVER')
   OR (u.username = 'noc1'      AND r.role_code = 'NOC_OPERATOR')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────
-- Seed: Devices
-- ─────────────────────────────────────────────────────

INSERT INTO devices (id, hostname, mgmt_ip, vendor, model, version, status, managed, connection_type) VALUES
  (gen_random_uuid(), 'PE1-GZ',  '10.0.0.1', 'Huawei', 'NE40E-X8',  'V8R22', 'ONLINE',  true, 'NETCONF'),
  (gen_random_uuid(), 'PE2-SH',  '10.0.0.2', 'Huawei', 'NE40E-X8',  'V8R22', 'ONLINE',  true, 'NETCONF'),
  (gen_random_uuid(), 'PE3-SH',  '10.0.0.3', 'Huawei', 'NE40E-X16', 'V8R22', 'OFFLINE', true, 'NETCONF'),
  (gen_random_uuid(), 'PE4-BJ',  '10.0.0.4', 'Huawei', 'NE40E-X8',  'V8R20', 'ONLINE',  true, 'NETCONF'),
  (gen_random_uuid(), 'PE5-BJ',  '10.0.0.5', 'Huawei', 'NE40E-X16', 'V8R22', 'ONLINE',  true, 'NETCONF'),
  (gen_random_uuid(), 'RR1-CD',  '10.0.1.1', 'Huawei', 'NE40E-X4',  'V8R22', 'ONLINE',  true, 'NETCONF'),
  (gen_random_uuid(), 'P1-WH',   '10.0.2.1', 'Huawei', 'NE40E-X16', 'V8R22', 'ONLINE',  true, 'NETCONF'),
  (gen_random_uuid(), 'CE1-GZ',  '10.1.0.1', 'Huawei', 'AR6300',    'V8R21', 'ONLINE',  true, 'SSH_CLI'),
  (gen_random_uuid(), 'CE2-SH',  '10.1.0.2', 'Huawei', 'AR6300',    'V8R21', 'ONLINE',  true, 'SSH_CLI')
ON CONFLICT (hostname) DO NOTHING;

-- ─────────────────────────────────────────────────────
-- Seed: Resource Pools
-- ─────────────────────────────────────────────────────

INSERT INTO resource_pools (id, pool_type, pool_name, min_value, max_value, total_count, allocated_count, utilization_pct) VALUES
  (gen_random_uuid(), 'VLAN',        'VLAN-Business-2000-2999',  2000, 2999, 1000, 730,  73.0),
  (gen_random_uuid(), 'VNI',         'VNI-Business-5000-5999',   5000, 5999, 1000, 280,  28.0),
  (gen_random_uuid(), 'RD',          'RD-Pool-65000',            1,    9999, 5000, 1280, 25.6),
  (gen_random_uuid(), 'RT',          'RT-Pool-65000',            1,    9999, 5000, 900,  18.0),
  (gen_random_uuid(), 'IP_LOOPBACK', 'Loopback-10.0.0.0/24',    NULL, NULL, 100,  52,   52.0),
  (gen_random_uuid(), 'IP_PEER',     'Peer-10.250.0.0/16',       NULL, NULL, 2500, 1700, 68.0),
  (gen_random_uuid(), 'IP_BUSINESS', 'Business-10.100.0.0/8',    NULL, NULL, 10000,3100, 31.0),
  (gen_random_uuid(), 'PE_CE',       'PE-CE-192.168.0.0/16',     NULL, NULL, 1000, 440,  44.0),
  (gen_random_uuid(), 'PORT',        'Interface-Pool-Global',    NULL, NULL, 10240,3588, 35.0)
ON CONFLICT (pool_name) DO NOTHING;

-- ─────────────────────────────────────────────────────
-- Seed: Sample Service Instances
-- ─────────────────────────────────────────────────────

DO $$
DECLARE
  alice_id UUID;
BEGIN
  SELECT id INTO alice_id FROM users WHERE username = 'alice';

  INSERT INTO service_instances (id, service_code, service_name, service_type, status, sla_target_percent, current_sla_percent, customer_name, created_by)
  VALUES
    (gen_random_uuid(), 'SVC-L3-008', '华为金融-广州互联',  'L3VPN', 'DEGRADED', 99.9, 95.2, '华为金融科技', alice_id),
    (gen_random_uuid(), 'SVC-L3-015', '平安银行-北京节点',  'L3VPN', 'ACTIVE',   99.5, 99.8, '平安银行',    alice_id),
    (gen_random_uuid(), 'SVC-VL-003', '中信证券-二层互通',  'VPLS',  'CHANGING', 99.5, 97.1, '中信证券',    alice_id),
    (gen_random_uuid(), 'SVC-L3-021', '招商银行-DC互联',    'L3VPN', 'ACTIVE',   99.9, 99.9, '招商银行',    alice_id),
    (gen_random_uuid(), 'SVC-L3-022', '国泰君安-上海互联',  'L3VPN', 'ACTIVE',   99.5, 99.5, '国泰君安',    alice_id)
  ON CONFLICT (service_code) DO NOTHING;
END $$;

-- ─────────────────────────────────────────────────────
-- Seed: Sample Alarms
-- ─────────────────────────────────────────────────────

INSERT INTO alarms (id, alarm_code, severity, source_type, source_name, description, status, aggregate_count)
VALUES
  (gen_random_uuid(), 'LINK_DOWN',   'P1', 'device', 'PE3-SH', 'GE0/0/1 Link Down',            'NEW',          1),
  (gen_random_uuid(), 'BGP_DOWN',    'P1', 'device', 'PE5-BJ', 'BGP邻居 10.0.0.9 断开',         'NEW',          1),
  (gen_random_uuid(), 'IF_UTIL_HIGH','P2', 'device', 'PE1-GZ', 'GE0/0/1 接口利用率 82%',        'ACKNOWLEDGED', 3),
  (gen_random_uuid(), 'MEM_HIGH',    'P3', 'device', 'CE12-CD','内存使用率 78%',                  'ACKNOWLEDGED', 1),
  (gen_random_uuid(), 'BFD_DOWN',    'P2', 'device', 'PE2-SH', 'BFD会话 Down，关联VPLS-003',    'CLOSED',       2)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────
-- Seed: QoS Profiles
-- ─────────────────────────────────────────────────────

INSERT INTO qos_profiles (id, template_name, cir_mbps, pir_mbps, priority_class, version, status)
VALUES
  (gen_random_uuid(), 'Gold-100M',   100, 120, 'EF', 'v1.2', 'published'),
  (gen_random_uuid(), 'Silver-50M',  50,  60,  'AF', 'v1.0', 'published'),
  (gen_random_uuid(), 'Bronze-10M',  10,  15,  'BE', 'v2.0', 'published')
ON CONFLICT (template_name) DO NOTHING;

-- ─────────────────────────────────────────────────────
-- Seed: SLA Profiles
-- ─────────────────────────────────────────────────────

INSERT INTO sla_profiles (id, template_name, availability_target, latency_target_ms, jitter_target_ms, bfd_tx_ms, bfd_rx_ms, version, status)
VALUES
  (gen_random_uuid(), 'Gold-99.9%',   99.9, 30,  5,  100, 100, 'v1.1', 'published'),
  (gen_random_uuid(), 'Silver-99.5%', 99.5, 50,  10, 100, 100, 'v2.1', 'published'),
  (gen_random_uuid(), 'Bronze-99%',   99.0, 100, 20, 300, 300, 'v1.0', 'published')
ON CONFLICT (template_name) DO NOTHING;
