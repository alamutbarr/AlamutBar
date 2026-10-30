import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useEffect, useState } from "react";
import { api } from "./services/api";
import { DriverLogin } from "@/pages/DriverLogin";
import { DriverDashboard } from "@/pages/DriverDashboard";
import { DriverMissions } from "@/pages/DriverMissions";
import { DriverMissionDetail } from "@/pages/DriverMissionDetail";
import { DriverProfile } from "@/pages/DriverProfile";
import { DriverLayout } from "@/layouts/DriverLayout";
import { serverVerificationComplete } from "@/verification";

function getProfileError(error) {
  if (error?.message === "پاسخ بک‌اند شامل اطلاعات راننده نیست.") return error.message;
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.error || error?.response?.data?.message;

  if (status === 401) {
    return "نشست ورود معتبر نیست یا منقضی شده است. روی «خروج و ورود مجدد» بزنید و دوباره وارد شوید.";
  }
  if (status === 404) {
    return "مسیر دریافت پروفایل در بک‌اند پیدا نشد. مطمئن شوید بک‌اند اصلاح‌شده اجرا شده و مسیر /api/driver/profile فعال است.";
  }
  if (!error?.response) {
    return "به بک‌اند وصل نشدیم. از ریشهٔ پروژه npm run dev را اجرا کنید تا API روی پورت 5000 بالا باشد.";
  }
  return serverMessage || `دریافت پروفایل ناموفق بود (HTTP ${status || "نامشخص"}).`;
}

export default function App() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [driver, setDriver] = useState(null);
  const [missions, setMissions] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setDriver(null);
      setMissions([]);
      setSelectedMission(null);
      setProfileError("");
      setProfileLoading(false);
      return undefined;
    }

    setDriver(null);
    setMissions([]);
    setSelectedMission(null);
    setProfileError("");
    setProfileLoading(true);

    async function loadProfile() {
      try {
        const res = await api.get("/driver/profile");
        if (!res.data?.driver) {
          throw new Error("پاسخ بک‌اند شامل اطلاعات راننده نیست.");
        }
        if (!cancelled) setDriver(res.data.driver);
      } catch (error) {
        console.error("Could not load driver profile:", error);
        if (!cancelled && error?.response?.status === 401) {
          // Remove stale JWTs and return directly to the login screen.
          // The user can then verify their phone and get a fresh token.
          logout();
          setProfileError("");
          return;
        }
        if (!cancelled) setProfileError(getProfileError(error));
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    async function loadOptionalData() {
      try {
        const res = await api.get("/driver/missions");
        if (!cancelled) setMissions(Array.isArray(res.data?.missions) ? res.data.missions : []);
      } catch (error) {
        console.warn("Could not load driver missions:", error);
        if (!cancelled) setMissions([]);
      }
    }

    loadProfile();
    loadOptionalData();

    return () => {
      cancelled = true;
    };
  }, [token, retryKey]);

  if (!token) {
    return <DriverLogin />;
  }

  if (profileLoading && !driver) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-600">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="font-medium">در حال دریافت اطلاعات راننده...</p>
      </div>
    );
  }

  if (!driver && profileError) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-3 text-xl font-bold text-slate-800">بارگذاری پنل ناموفق بود</h1>
          <p className="mb-5 leading-8 text-slate-600">{profileError}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setRetryKey((current) => current + 1)}
              className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
            >
              تلاش مجدد
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/driver", { replace: true });
              }}
              className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
            >
              خروج و ورود مجدد
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        اطلاعات راننده دریافت نشد. صفحه را دوباره تلاش کنید.
      </div>
    );
  }

  const currentPath = location.pathname.replace(/^\/driver\/?/, "") || "dashboard";
  const layoutCurrent = currentPath === "mission-detail" ? "missions" : currentPath;

  const handleMissionAction = async (mission, action, extra = {}) => {
    try {
      const res = await api.post(`/driver/missions/${mission.id}/change-status`, {
        status: action,
        deliveryOtp: extra.otp,
        exceptionReason: extra.exceptionReason,
      });
      setMissions((previous) => previous.map((item) =>
        item.id === mission.id ? { ...item, status: res.data.status } : item,
      ));
      setSelectedMission((previous) => previous ? { ...previous, status: res.data.status } : null);
    } catch (error) {
      console.error("Could not update mission:", error);
    }
  };

  // گرفتن بار (قبول مأموریت) مستلزم احراز هویت است؛ اگر کامل نباشد،
  // کاربر به بخش مدارک پروفایل هدایت می‌شود و اعلان اجباری‌بودن نمایش می‌گیرد.
  const handleAccept = (mission) => {
    if (!serverVerificationComplete(driver.documents)) {
      navigate("/driver/profile", { state: { verificationRequired: true } });
      return;
    }
    handleMissionAction(mission, "Accepted");
  };

  return (
    <DriverLayout
      current={layoutCurrent}
      onNavigate={(path) => navigate(`/driver/${path}`)}
      onLogout={logout}
      driverName={driver.name}
    >
      <Routes>
        <Route index element={<Navigate to="/driver/dashboard" replace />} />
        <Route
          path="dashboard"
          element={
            <DriverDashboard
              driver={driver}
              missions={missions}
              gpsStatus="active"
              onNavigate={(path) => navigate(`/driver/${path}`)}
              onMissionClick={(mission) => {
                setSelectedMission(mission);
                navigate("/driver/mission-detail");
              }}
              onDriverUpdate={setDriver}
            />
          }
        />
        <Route
          path="missions"
          element={
            <DriverMissions
              missions={missions}
              onMissionClick={(mission) => {
                setSelectedMission(mission);
                navigate("/driver/mission-detail");
              }}
            />
          }
        />
        <Route
          path="mission-detail"
          element={selectedMission ? (
            <DriverMissionDetail
              mission={selectedMission}
              onBack={() => navigate(-1)}
              onAccept={handleAccept}
              onAction={(mission, action) => {
                const statusMap = {
                  en_route: "EnRouteToPickup",
                  arrived_pickup: "ArrivedPickup",
                  start_move: "InTransit",
                };
                if (statusMap[action]) handleMissionAction(mission, statusMap[action]);
              }}
              onPodComplete={(mission, result) => handleMissionAction(mission, "Completed", result || {})}
            />
          ) : <Navigate to="/driver/missions" replace />}
        />
        <Route path="profile" element={<DriverProfile driver={driver} onLogout={logout} onDriverUpdate={setDriver} />} />
        <Route path="*" element={<Navigate to="/driver/dashboard" replace />} />
      </Routes>
    </DriverLayout>
  );
}
