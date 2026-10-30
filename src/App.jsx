import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Landing from './landing/Home.jsx';
import { AuthProvider as OwnerAuth } from './panels/owner/context/AuthContext.jsx';
import { ToastProvider } from './panels/owner/context/ToastContext.jsx';
import { AuthProvider as DriverAuth } from './panels/driver/contexts/AuthContext.jsx';
import { AdminAuthProvider } from './panels/admin/auth.jsx';
import { InspectorAuthProvider } from './panels/inspector/auth.jsx';
import { PanelThemeProvider } from './shared/theme/PanelTheme.jsx';

const OwnerApp = lazy(() => import('./panels/owner/App.jsx'));
const DriverApp = lazy(() => import('./panels/driver/App.jsx'));
const AdminApp = lazy(() => import('./panels/admin/App.jsx'));
const InspectorApp = lazy(() => import('./panels/inspector/App.jsx'));

function PanelFallback() {
  return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f6f0', color: '#17383b' }}>
      در حال بارگذاری پنل...
    </div>
  );
}

function panel(node) {
  return <Suspense fallback={<PanelFallback />}>{node}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/owner/*"
        element={panel(
          <ToastProvider>
            <OwnerAuth>
              <PanelThemeProvider panel="owner">
                <OwnerApp />
              </PanelThemeProvider>
            </OwnerAuth>
          </ToastProvider>,
        )}
      />
      <Route
        path="/driver/*"
        element={panel(
          <DriverAuth>
            <PanelThemeProvider panel="driver">
              <DriverApp />
            </PanelThemeProvider>
          </DriverAuth>,
        )}
      />
      <Route
        path="/admin/*"
        element={panel(
          <AdminAuthProvider>
            <AdminApp />
          </AdminAuthProvider>,
        )}
      />
      <Route
        path="/inspector/*"
        element={panel(
          <InspectorAuthProvider>
            <InspectorApp />
          </InspectorAuthProvider>,
        )}
      />
    </Routes>
  );
}
