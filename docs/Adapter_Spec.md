# SDN 控制器 - 南向适配器规范

## 1. 适配器架构概览

```
┌──────────────────────────────────────┐
│    deploy-service (配置编译、发下)   │
└──────────┬───────────────────────────┘
           │
    ┌──────┴───────┬────────────────┐
    │              │                │
┌───▼──────┐  ┌──▼────────┐  ┌────▼─────┐
│ NETCONF  │  │ SSH CLI   │  │ SNMP      │
│Adapter   │  │Adapter    │  │Collector  │
└───┬──────┘  └──┬────────┘  └────┬─────┘
    │            │                │
    └────────────┼────────────────┘
                 │
    ┌────────────▼─────────────────┐
    │  南向设备 (Huawei VRP)       │
    │ PE/RR/P/CE 各系列设备        │
    └──────────────────────────────┘
```

---

## 2. NETCONF 适配器规范

### 2.1 设备连接参数

```json
{
  "connection": {
    "protocol": "NETCONF",
    "host": "10.1.1.1",
    "port": 830,
    "timeout_sec": 30,
    "device_type": "huawei_vrp"
  },
  "auth": {
    "username": "admin",
    "password": "encrypted_password",    // 使用Vault加密存储
    "key_file": "/path/to/ssh_key"      // 可选
  }
}
```

### 2.2 NETCONF操作流程

#### Step 1: 建立会话
```
客户端 → NETCONF服务器 (port 830)
发送: <hello> 消息含NETCONF capabilities
服务器返回: <hello> 消息含支持的YANG模型
状态: 建立session, 获得session-id
```

#### Step 2: 锁定候选配置库
```xml
<rpc message-id="1">
  <lock>
    <target>
      <candidate/>
    </target>
  </lock>
</rpc>

<!-- 响应 -->
<rpc-reply message-id="1">
  <ok/>
</rpc-reply>
```

#### Step 3: 编辑配置
```xml
<rpc message-id="2">
  <edit-config>
    <target>
      <candidate/>
    </target>
    <default-operation>merge</default-operation>
    <config>
      <!-- YANG配置内容 -->
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
    </config>
  </edit-config>
</rpc>
```

#### Step 4: 验证配置
```xml
<rpc message-id="3">
  <validate>
    <source>
      <candidate/>
    </source>
  </validate>
</rpc>

<!-- 成功响应 -->
<rpc-reply message-id="3">
  <ok/>
</rpc-reply>

<!-- 失败响应 -->
<rpc-reply message-id="3">
  <rpc-error>
    <error-type>application</error-type>
    <error-tag>operation-failed</error-tag>
    <error-severity>error</error-severity>
    <error-message>VRF名称重复</error-message>
  </rpc-error>
</rpc-reply>
```

#### Step 5: 提交配置
```xml
<rpc message-id="4">
  <commit/>
</rpc>

<!-- 响应 -->
<rpc-reply message-id="4">
  <ok/>
</rpc-reply>
```

#### Step 6: 解锁候选配置库
```xml
<rpc message-id="5">
  <unlock>
    <target>
      <candidate/>
    </target>
  </unlock>
</rpc>
```

### 2.3 Huawei VRP YANG 模型映射

#### L3VPN 配置示例

```xml
<config>
  <l3vpn xmlns="http://www.huawei.com/netconf">
    <vrfs>
      <vrf>
        <vrfName>cust_a_vrf</vrfName>
        <vrfDescription>Customer A VRF</vrfDescription>
        <rdFormat>0</rdFormat>
        <rdValue>
          <asNumber>65001</asNumber>
          <assignedNumber>1001</assignedNumber>
        </rdValue>
        <rtImportList>
          <rtList>
            <rtFormat>0</rtFormat>
            <rtValue>
              <asNumber>65001</asNumber>
              <assignedNumber>1001</assignedNumber>
            </rtValue>
          </rtList>
        </rtImportList>
        <rtExportList>
          <rtList>
            <rtFormat>0</rtFormat>
            <rtValue>
              <asNumber>65001</asNumber>
              <assignedNumber>1001</assignedNumber>
            </rtValue>
          </rtList>
        </rtExportList>
        <routers>
          <routerId>10.0.0.1</routerId>
        </routers>
      </vrf>
    </vrfs>
  </l3vpn>
  
  <!-- 接口配置 -->
  <interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
    <interface>
      <name>GigabitEthernet0/0/0</name>
      <type xmlns:ianaift="urn:ietf:params:xml:ns:yang:iana-if-type">ianaift:ethernetCsmacd</type>
      <enabled>true</enabled>
      <mtu>1500</mtu>
      <!-- 子接口配置 -->
      <subInterface>
        <subInterfaceName>GigabitEthernet0/0/0.2001</subInterfaceName>
        <vlanId>2001</vlanId>
        <vrfName>cust_a_vrf</vrfName>
        <ipv4>
          <enabled>true</enabled>
          <address>
            <ip>192.168.1.1</ip>
            <prefix-length>24</prefix-length>
          </address>
        </ipv4>
      </subInterface>
    </interface>
  </interfaces>
  
  <!-- BGP配置 -->
  <bgp xmlns="http://www.huawei.com/netconf">
    <bgpInstances>
      <bgpInstance>
        <instanceName/>
        <asNumber>65001</asNumber>
        <routerId>10.0.0.1</routerId>
        <addressFamilies>
          <addressFamily>
            <afType>ipv4-unicast</afType>
          </addressFamily>
          <addressFamily>
            <afType>vpnv4</afType>
          </addressFamily>
        </addressFamilies>
        <bgpNbrCfgList>
          <bgpNbrCfg>
            <nbrAddr>10.1.1.2</nbrAddr>
            <remoteAs>65001</remoteAs>
            <afCfgList>
              <afCfg>
                <afType>ipv4-unicast</afType>
                <enableFlag>true</enableFlag>
              </afCfg>
            </afCfgList>
          </bgpNbrCfg>
        </bgpNbrCfgList>
      </bgpInstance>
    </bgpInstances>
  </bgp>
</config>
```

---

## 3. SSH CLI 适配器规范

### 3.1 设备连接参数

```json
{
  "connection": {
    "protocol": "SSH",
    "device_type": "huawei_vrp",
    "host": "10.1.1.1",
    "port": 22,
    "timeout_sec": 30,
    "read_timeout_sec": 10
  },
  "auth": {
    "username": "admin",
    "password": "encrypted_password"
  }
}
```

### 3.2 命令执行流程

#### 初始化连接
```
1. SSH连接到10.1.1.1:22
2. 认证成功
3. 获取设备prompt (通常是 ">")
4. 进入system-view模式 (命令: "system-view")
5. 此后prompt变为 "[device_name-config]"
```

#### 命令下发基础流程
```
for each command in command_list:
    1. 发送: command + "\n"
    2. 等待设备返回 (timeout: 10s)
    3. 检查返回内容:
        - 若包含 "command invalid" → 错误
        - 若包含 device_name-config prompt → 成功
        - 若超时 → 错误
    4. 记录执行结果
    5. (可选) 解析返回信息验证
```

### 3.3 常见命令集

#### L3VPN配置

```bash
# 进入配置模式
system-view

# 创建VRF
ip vpn-instance cust_a_vrf
 ipv4-family
  route-distinguisher 65001:1001
  vpn-target 65001:1001 export-extcommunity
  vpn-target 65001:1001 import-extcommunity
 exit-ipv4-family
exit

# 配置接口子接口
interface GigabitEthernet0/0/0.2001
 encapsulation dot1q vid 2001
 ip binding vpn-instance cust_a_vrf
 ip address 192.168.1.1 255.255.255.0
exit

# 配置BGP (PE路由器)
bgp 65001
 bgp router-id 10.0.0.1
 peer 10.1.1.2 as-number 65001
 ipv4-family unicast
  peer 10.1.1.2 enable
  ipv4-family vpnv4
   peer 10.1.1.2 enable
 quit
exit

# 配置BGP邻接(VRF内)
bgp 65001
 ipv4-family vpnv4
  vrf cust_a_vrf
   bgp router-id 10.100.0.1
   peer 192.168.1.2 as-number 65002
   ipv4-family unicast
    peer 192.168.1.2 enable
    network 10.100.0.0 255.0.0.0
   quit
  quit
 quit
exit

# 保存配置
save

# 退出配置模式
quit
```

#### VPLS配置

```bash
system-view

# 创建VSI (Huawei VPLS)
vsi cust_b_vsi
 pwsignal ldp
 vni 5001
 route-distinguisher 65001:2001
 vpn-target 65001:2001 export-extcommunity
 vpn-target 65001:2001 import-extcommunity
exit

# 绑定AC接口
interface GigabitEthernet0/0/1
 service-instance 3001
  encapsulation s-vid 3001
  xconnect vsi cust_b_vsi
 exit-service-instance
exit

# 绑定隧道
interface Tunnel10
 mtu 1500
 tunnel-protocol mpls
 tunnel source 10.0.0.1
 tunnel destination 10.0.0.2
exit

save
quit
```

### 3.4 错误处理与重试

#### 错误识别规则

```python
# 检查返回内容中的错误关键字
error_keywords = [
    "Error:",
    "command invalid",
    "Unknown command",
    "Ambiguous command",
    "Too many parameters",
    "Missing parameter",
    "VRF name already exists",
    "Invalid IP address"
]

# 若返回包含上述关键字,标记为失败
```

#### 失败恢复策略

```
单命令失败:
1. 记录错误消息
2. 尝试回滚此命令的逆向操作 (如有定义)
3. 返回错误并停止后续命令

批量命令失败:
1. 若失败命令<=5个: 逐个恢复
2. 若失败命令>5个: 恢复整个批次,采用pre-change snapshot
3. 记录完整日志供root cause分析
```

---

## 4. SNMP Collector 规范

### 4.1 采集参数配置

```json
{
  "snmp_config": {
    "version": "snmpv3",
    "host": "10.1.1.1",
    "port": 161,
    "timeout_sec": 10,
    "retries": 3
  },
  "snmpv3_auth": {
    "username": "snmp_user",
    "auth_protocol": "MD5",      // MD5 或 SHA
    "auth_password": "encrypted",
    "priv_protocol": "DES",       // DES, 3DES, AES
    "priv_password": "encrypted"
  },
  "polling_interval": {
    "device_info": 3600,          // 1小时1次(版本、序列号)
    "interface_status": 60,       // 1分钟1次(接口up/down)
    "traffic_metrics": 60,        // 1分钟1次(接口流量)
    "cpu_memory": 300             // 5分钟1次(CPU、内存)
  }
}
```

### 4.2 OID 映射表 (Huawei VRP)

#### 设备基本信息

| 项目 | OID | 说明 |
|------|-----|------|
| sysDescr | 1.3.6.1.2.1.1.1.0 | 系统描述(如:Huawei VRP) |
| sysObjectID | 1.3.6.1.2.1.1.2.0 | 设备类型OID |
| sysUpTime | 1.3.6.1.2.1.1.3.0 | 启动时间(100分之1秒) |
| sysContact | 1.3.6.1.2.1.1.4.0 | 联系人 |
| sysName | 1.3.6.1.2.1.1.5.0 | 设备主机名 |
| sysLocation | 1.3.6.1.2.1.1.6.0 | 设备位置 |

#### 接口状态

| 项目 | OID | 说明 |
|------|-----|------|
| ifIndex | 1.3.6.1.2.1.2.2.1.1.{ifIndex} | 接口索引 |
| ifName | 1.3.6.1.2.1.31.1.1.1.1.{ifIndex} | 接口名(GE0/0/0) |
| ifType | 1.3.6.1.2.1.2.2.1.3.{ifIndex} | 接口类型(以太网=6) |
| ifAdminStatus | 1.3.6.1.2.1.2.2.1.7.{ifIndex} | 管理状态(1=up, 2=down) |
| ifOperStatus | 1.3.6.1.2.1.2.2.1.8.{ifIndex} | 运行状态(1=up, 2=down) |
| ifSpeed | 1.3.6.1.2.1.2.2.1.5.{ifIndex} | 接口速率(bps) |
| ifMtu | 1.3.6.1.2.1.2.2.1.4.{ifIndex} | MTU |
| ifAlias | 1.3.6.1.2.1.31.1.1.1.18.{ifIndex} | 接口描述 |

#### 接口流量

| 项目 | OID | 说明 |
|------|-----|------|
| ifInOctets | 1.3.6.1.2.1.2.2.1.10.{ifIndex} | 入流量(字节数) |
| ifOutOctets | 1.3.6.1.2.1.2.2.1.16.{ifIndex} | 出流量(字节数) |
| ifInErrors | 1.3.6.1.2.1.2.2.1.14.{ifIndex} | 入错包 |
| ifOutErrors | 1.3.6.1.2.1.2.2.1.20.{ifIndex} | 出错包 |
| ifInDiscards | 1.3.6.1.2.1.2.2.1.13.{ifIndex} | 入丢弃 |
| ifOutDiscards | 1.3.6.1.2.1.2.2.1.19.{ifIndex} | 出丢弃 |

#### CPU/内存 (Huawei扩展OID)

| 项目 | OID | 说明 |
|------|-----|------|
| hwEntityCpuUsage | 1.3.6.1.4.1.2011.2.25.1.1.1.1 | CPU使用率(%) |
| hwEntityMemUsage | 1.3.6.1.4.1.2011.2.25.1.2.1.1 | 内存使用率(%) |

### 4.3 指标计算公式

#### 接口流量(bps)

```
inOcts_new = ifInOctets当前值
inOcts_old = ifInOctets上次值
interval = 采样间隔(秒)

in_bps = ((inOcts_new - inOcts_old) * 8) / interval
out_bps = ((ifOutOctets_new - ifOutOctets_old) * 8) / interval

# 处理计数器重置 (32bit OID会翻转)
if (inOcts_new < inOcts_old) and (inOcts_old - inOcts_new > 2^31):
    inOcts_new += 2^32  # 64bit重新计算
```

#### 丢包率(%)

```
drop_pps = ((ifInDiscards_new - ifInDiscards_old) + 
            (ifOutDiscards_new - ifOutDiscards_old)) / interval

drop_percentage = (drop_pps / (in_pps + out_pps)) * 100
```

### 4.4 告警陷阱处理 (SNMP Trap)

#### 陷阱类型

| 陷阱类型 | OID | 含义 | 处理 |
|---------|-----|------|------|
| linkDown | 1.3.6.1.6.3.1.1.5.3 | 链路故障 | 立即告警 |
| linkUp | 1.3.6.1.6.3.1.1.5.4 | 链路恢复 | 关闭相关告警 |
| coldStart | 1.3.6.1.6.3.1.1.5.1 | 冷启动 | 设备重启Tell |
| warmStart | 1.3.6.1.6.3.1.1.5.2 | 热启动 | 设备重启 |

#### 陷阱处理流程

```
接收陷阱消息
  ├─ 解析源IP、OID、变量
  ├─ 匹配陷阱类型
  ├─ 关联设备与接口
  ├─ 生成告警事件
  └─ 推送至Kafka告警队列 → assurance-service处理
```

---

## 5. 错误与故障排查

### 5.1 常见错误代码

| 错误码 | 含义 | 原因 | 应对 |
|--------|------|------|------|
| -1001 | 连接超时 | 网络不通或端口关闭 | 检查IP、端口,ping测试 |
| -1002 | 认证失败 | 用户/密码错误 | 确认凭证,检查Vault加密 |
| -1003 | 会话关闭 | 设备主动断开连接 | 日志中查看设备端错误 |
| -2001 | YANG验证失败 | 配置不符合YANG schema | 检查XML格式,重新渲染 |
| -2002 | 命令非法 | 命令语法错误 | 检查命令库,对标设备实际版本 |
| -2003 | 资源冲突 | VRF/VLAN已存在 | 检查资源池,确保无重复分配 |

### 5.2 调试日志示例

```
2026-04-07T14:00:00Z [DEBUG] NETCONF Adapter: Connecting to 10.1.1.1:830
2026-04-07T14:00:01Z [DEBUG] NETCONF Adapter: SSH connection established
2026-04-07T14:00:02Z [DEBUG] NETCONF Adapter: Received server hello, capabilities: [ietf-netconf-1.0, yang-module:ietf-interfaces:2018-02-20]
2026-04-07T14:00:03Z [DEBUG] NETCONF Adapter: Sending lock request
2026-04-07T14:00:03Z [DEBUG] NETCONF Adapter: Lock successful
2026-04-07T14:00:04Z [DEBUG] NETCONF Adapter: Sending 1 edit-config RPC
2026-04-07T14:00:05Z [DEBUG] NETCONF Adapter: Edit config response: ok
2026-04-07T14:00:06Z [DEBUG] NETCONF Adapter: Validating configuration...
2026-04-07T14:00:07Z [DEBUG] NETCONF Adapter: Validation passed
2026-04-07T14:00:08Z [DEBUG] NETCONF Adapter: Committing configuration...
2026-04-07T14:00:10Z [INFO] NETCONF Adapter: Commit successful, config applied
2026-04-07T14:00:11Z [DEBUG] NETCONF Adapter: Unlock successful
2026-04-07T14:00:11Z [DEBUG] NETCONF Adapter: Configuration deployment completed (10 seconds)
```

---

**文档版本**: v1.0  
**最后更新**: 2026-04-07
