import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import LoginPage from './pages/Login'

// Pages
import Dashboard from './pages/Dashboard'
import AlarmList from './pages/AlarmList'
import OrderList from './pages/OrderList'
import DeviceList from './pages/DeviceList'
import DeviceDetail from './pages/DeviceDetail'
import TopologyMap from './pages/TopologyMap'
import InterfacePool from './pages/InterfacePool'
import IpPool from './pages/IpPool'
import VlanPool from './pages/VlanPool'
import ServiceCatalog from './pages/ServiceCatalog'
import L3VpnWizard from './pages/L3VpnWizard'
import VplsWizard from './pages/VplsWizard'
import ServiceList from './pages/ServiceList'
import TePolicy from './pages/TePolicy'
import PathEditor from './pages/PathEditor'
import QosTemplates from './pages/QosTemplates'
import SlaTemplates from './pages/SlaTemplates'
import ChangeList from './pages/ChangeList'
import ChangeDetail from './pages/ChangeDetail'
import Precheck from './pages/Precheck'
import DeployConsole from './pages/DeployConsole'
import RollbackCenter from './pages/RollbackCenter'
import Performance from './pages/Performance'
import SlaBoard from './pages/SlaBoard'
import Reports from './pages/Reports'
import AuditLog from './pages/AuditLog'
import SystemAdmin from './pages/SystemAdmin'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="alarms"       element={<AlarmList />} />
            <Route path="orders"       element={<OrderList />} />
            <Route path="devices"      element={<DeviceList />} />
            <Route path="devices/:id"  element={<DeviceDetail />} />
            <Route path="topology"     element={<TopologyMap />} />
            <Route path="pools/interfaces" element={<InterfacePool />} />
            <Route path="pools/ip"     element={<IpPool />} />
            <Route path="pools/vlan"   element={<VlanPool />} />
            <Route path="catalog"      element={<ServiceCatalog />} />
            <Route path="provision/l3vpn" element={<L3VpnWizard />} />
            <Route path="provision/vpls"  element={<VplsWizard />} />
            <Route path="services"     element={<ServiceList />} />
            <Route path="policies/te"  element={<TePolicy />} />
            <Route path="policies/path" element={<PathEditor />} />
            <Route path="policies/qos" element={<QosTemplates />} />
            <Route path="policies/sla" element={<SlaTemplates />} />
            <Route path="changes"      element={<ChangeList />} />
            <Route path="changes/:id"  element={<ChangeDetail />} />
            <Route path="changes/:id/precheck" element={<Precheck />} />
            <Route path="deploy"       element={<DeployConsole />} />
            <Route path="rollback"     element={<RollbackCenter />} />
            <Route path="performance"  element={<Performance />} />
            <Route path="sla"          element={<SlaBoard />} />
            <Route path="reports"      element={<Reports />} />
            <Route path="audit"        element={<AuditLog />} />
            <Route path="system"       element={<SystemAdmin />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
