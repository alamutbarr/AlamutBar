import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";
import CreateShipment from "./pages/shipment/CreateShipment";
import ShipmentHistory from "./pages/shipment/ShipmentHistory";
import ShipmentDetail from "./pages/shipment/ShipmentDetail";
import Notifications from "./pages/notification/Notifications";
import Complaints from "./pages/complaint/Complaints";
import Profile from "./pages/profile/profile";
import OwnerLayout from "./layouts/OwnerLayout";
import NationalIdRequired from "./pages/auth/NationalIdRequired";
import { isValidNationalId } from "./utils/nationalId";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-route-bg text-sm text-ink-300">
        در حال بارگذاری...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/owner/login" replace />;
  }

  if (
    !isValidNationalId(user.national_id) &&
    location.pathname !== "/owner/complete-national-id"
  ) {
    return <Navigate to="/owner/complete-national-id" replace />;
  }

  return children;
};

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="create-shipment" element={<CreateShipment />} />
        <Route path="shipments" element={<ShipmentHistory />} />
        <Route path="shipments/:id" element={<ShipmentDetail />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="complaints" element={<Complaints />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route
        path="complete-national-id"
        element={
          <ProtectedRoute>
            <NationalIdRequired />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/owner/dashboard" replace />} />
    </Routes>
  );
}
