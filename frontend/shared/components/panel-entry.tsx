"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { api, ApiError, type User } from "@/lib/api";
import { panelApps, type PanelKey } from "@/lib/panels";
import Auth from "./auth";
import Workspace from "./workspace";
import PWA from "./pwa";
import { Loading } from "./ui";
export default function PanelEntry({ panel }: { panel: PanelKey }) {
  const [user, setUser] = useState<User | null | undefined>(),
    [error, setError] = useState("");
  const app = panelApps[panel];
  const router = useRouter();
  const needsDriverReview =
    panel === "driver" &&
    user?.role === "driver" &&
    !user.driver_market_enabled;
  async function load() {
    setError("");
    try {
      setUser(await api<User>("auth/me/"));
    } catch (e) {
      if (e instanceof ApiError && e.code === "not_authenticated")
        setUser(null);
      else setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [panel]);
  useEffect(() => {
    if (needsDriverReview) router.replace("/driver/onboarding");
  }, [needsDriverReview, router]);
  if (error)
    return (
      <main id="main" className="standalone-state">
        <h1>{app.name}</h1>
        <p className="error" role="alert">
          {error}
        </p>
        <button className="btn" onClick={() => void load()}>
          تلاش مجدد
        </button>
      </main>
    );
  if (user === undefined || needsDriverReview)
    return (
      <main id="main">
        <Loading />
      </main>
    );
  if (user?.role === app.role)
    return <Workspace role={app.role} section="dashboard" />;
  if (user)
    return (
      <main id="main" className="standalone-state">
        <div className="app-entry-tools">
          <PWA panel={panel} />
        </div>
        <h1>این برنامه ویژهٔ {app.short} است.</h1>
        <p>
          حساب فعلی به نقش دیگری تعلق دارد. برای استفاده، از حساب فعلی خارج و با
          حساب {app.short} وارد شوید.
        </p>
        <button
          className="btn"
          onClick={async () => {
            try {
              await api("auth/logout/", "POST", {});
              setUser(null);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          خروج و ورود با نقش {app.short}
        </button>
      </main>
    );
  return (
    <>
      <div className="app-entry-tools">
        <PWA panel={panel} />
      </div>
      <Suspense fallback={<Loading />}>
        <Auth fixedRole={app.role} onSignedIn={setUser} />
      </Suspense>
    </>
  );
}
