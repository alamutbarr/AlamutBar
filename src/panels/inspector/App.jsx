import { Navigate, NavLink, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { useInspector } from './auth';
import Login from './pages/Login';
import Visits from './pages/Visits';
import Visit from './pages/Visit';
import BrandMark from '../owner/components/common/BrandMark';
import './inspector.css';

function Shell() {
  const { user, logout } = useInspector();
  const navigate = useNavigate();
  return (
    <div className="inspector-app">
      <div className="inspector-frame">
        <header className="inspector-top">
          <BrandMark light subtitle="متصدی میدان" />
          <div style={{ flex: 1 }} />
          <button type="button" className="inspector-btn secondary" style={{ width: 'auto', color: 'inherit', borderColor: 'rgba(247,246,240,.4)' }} onClick={async () => { await logout(); navigate('/inspector/login'); }}>
            {user?.fullName ? 'خروج' : ''}
          </button>
        </header>
        <main className="inspector-main"><Outlet /></main>
        <nav className="inspector-bottom">
          <NavLink to="/inspector" end className={({ isActive }) => (isActive ? 'active' : '')}>مراجعه‌ها</NavLink>
          <NavLink to="/inspector/done" className={({ isActive }) => (isActive ? 'active' : '')}>بسته</NavLink>
        </nav>
      </div>
    </div>
  );
}

function Guard() {
  const { user, loading } = useInspector();
  if (loading) return <div className="inspector-app" style={{ display: 'grid', placeItems: 'center' }}>در حال آماده‌سازی...</div>;
  if (!user) return <Navigate to="/inspector/login" replace />;
  return <Shell />;
}

export default function InspectorApp() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route element={<Guard />}>
        <Route index element={<Visits scope="open" />} />
        <Route path="done" element={<Visits scope="done" />} />
        <Route path="missions/:id" element={<Visit />} />
      </Route>
      <Route path="*" element={<Navigate to="/inspector" replace />} />
    </Routes>
  );
}
