import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { useInspector } from './auth';
import Login from './pages/Login';
import Visits from './pages/Visits';
import Visit from './pages/Visit';
import Profile from './pages/Profile';
import BrandMark from '../owner/components/common/BrandMark';
import './inspector.css';

function Shell() {
  return (
    <div className="inspector-app">
      <div className="inspector-frame">
        <header className="inspector-top">
          <BrandMark light subtitle="متصدی میدان" />
          <div style={{ flex: 1 }} />
        </header>
        <main className="inspector-main"><Outlet /></main>
        <nav className="inspector-bottom">
          <NavLink to="/inspector" end className={({ isActive }) => (isActive ? 'active' : '')}>مراجعه‌ها</NavLink>
          <NavLink to="/inspector/done" className={({ isActive }) => (isActive ? 'active' : '')}>بسته</NavLink>
          <NavLink to="/inspector/profile" className={({ isActive }) => (isActive ? 'active' : '')}>پروفایل</NavLink>
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
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/inspector" replace />} />
    </Routes>
  );
}
