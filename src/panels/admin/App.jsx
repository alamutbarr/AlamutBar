import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAdmin } from './auth';
import Shell from './components/Shell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import MapPage from './pages/MapPage';
import Alerts from './pages/Alerts';
import Drivers from './pages/Drivers';
import DriverDetail from './pages/DriverDetail';
import OpsPages from './pages/OpsPages';
import './admin.css';

function Guard() {
  const { user, loading } = useAdmin();
  if (loading) return <div className="admin-app" style={{ display: 'grid', placeItems: 'center' }}>در حال آماده‌سازی مرکز عملیات...</div>;
  if (!user) return <Navigate to="/admin/login" replace />;
  return <Shell />;
}

export default function AdminApp() {
  return (
    <>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<Guard />}>
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="map" element={<MapPage />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="drivers" element={<Drivers />} />
          <Route path="drivers/:id" element={<DriverDetail />} />
          <Route path="inspections" element={<OpsPages page="inspections" />} />
          <Route path="customers" element={<OpsPages page="customers" />} />
          <Route path="complaints" element={<OpsPages page="complaints" />} />
          <Route path="reports" element={<OpsPages page="reports" />} />
          <Route path="settings" element={<OpsPages page="settings" />} />
          <Route path="admins" element={<OpsPages page="admins" />} />
          <Route path="audit" element={<OpsPages page="audit" />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </>
  );
}
