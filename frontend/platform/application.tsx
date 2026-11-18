import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, useLocation } from "react-router";
import PanelEntry from "@/components/panel-entry";
import Workspace from "@/components/workspace";
import Auth from "@/components/auth";
import Recovery from "@/components/recovery";
import InputNormalizer from "@/components/input-normalizer";
import { PanelBoundary } from "@/components/panel-feedback";
import { panelApps, validPanelRoute } from "@/lib/panels";
import "../shared/styles/globals.css";
import "../shared/styles/mobile-workspace.css";

export type Panel = "driver" | "owner" | "inspector";
function Application({ panel }: { panel: Panel }) {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);
  useEffect(() => {
    document.title = panelApps[panel].name;
    window.scrollTo(0, 0);
  }, [location.pathname, panel]);
  if (!parts.length) return <Navigate to={`/${panel}/app`} replace />;
  if (parts.length === 1) {
    if (parts[0] === "login") return <Auth fixedRole={panel} />;
    if (parts[0] === "register" && panel !== "inspector")
      return <Auth fixedRole={panel} register />;
    if (parts[0] === "recover") return <Recovery />;
  }
  const [role, section = "app", detailId] = parts;
  if (role !== panel || !validPanelRoute(panel, parts.slice(1)))
    return (
      <main id="main" className="empty">
        <h1>این صفحه در دسترس نیست.</h1>
        <a className="btn" href={`/${panel}/app`}>
          ورود به برنامه
        </a>
      </main>
    );
  if (section === "app") return <PanelEntry panel={panel} />;
  return <Workspace role={panel} section={section} detailId={detailId} />;
}
export function mountApplication(panel: Panel) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <InputNormalizer />
        <a href="#main" className="skip">
          رفتن به محتوای اصلی
        </a>
        <PanelBoundary>
          <Application panel={panel} />
        </PanelBoundary>
      </BrowserRouter>
    </StrictMode>,
  );
}
