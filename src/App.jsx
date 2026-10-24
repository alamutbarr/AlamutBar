import { Route, Routes } from 'react-router-dom';
import Landing from './landing/Home.jsx';
import OwnerApp from './panels/owner/App.jsx';
import { AuthProvider as OwnerAuth } from './panels/owner/context/AuthContext.jsx';
import { ToastProvider } from './panels/owner/context/ToastContext.jsx';
import DriverApp from './panels/driver/App.jsx';
import { AuthProvider as DriverAuth } from './panels/driver/contexts/AuthContext.jsx';
import AdminApp from './panels/admin/App.jsx';
import { AdminAuthProvider } from './panels/admin/auth.jsx';
import InspectorApp from './panels/inspector/App.jsx';
import { InspectorAuthProvider } from './panels/inspector/auth.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route
        path="/owner/*"
        element={(
          <ToastProvider>
            <OwnerAuth>
              <OwnerApp />
            </OwnerAuth>
          </ToastProvider>
        )}
      />
      <Route
        path="/driver/*"
        element={(
          <DriverAuth>
            <DriverApp />
          </DriverAuth>
        )}
      />
      <Route
        path="/admin/*"
        element={(
          <AdminAuthProvider>
            <AdminApp />
          </AdminAuthProvider>
        )}
      />
      <Route
        path="/inspector/*"
        element={(
          <InspectorAuthProvider>
            <InspectorApp />
          </InspectorAuthProvider>
        )}
      />
    </Routes>
  );
}
