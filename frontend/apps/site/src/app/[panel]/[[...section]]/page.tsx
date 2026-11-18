import type { Metadata } from "next";
import Workspace from "@/components/workspace";
import PanelEntry from "@/components/panel-entry";
import {
  panelApps,
  panelRole,
  validPanelRoute,
  type PanelKey,
} from "@/lib/panels";
import { notFound, redirect } from "next/navigation";
type Props = { params: Promise<{ panel: string; section?: string[] }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { panel } = await params;
  const app = Object.hasOwn(panelApps, panel)
    ? panelApps[panel as PanelKey]
    : undefined;
  if (!app) return { robots: { index: false, follow: false } };
  return {
    title: app.name,
    robots: { index: false, follow: false },
    manifest: "/pwa/" + panel + "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "default", title: app.name },
    icons: { apple: "/pwa/icons/" + panel + "-192.png" },
  };
}
export default async function PanelPage({ params }: Props) {
  const { panel, section = [] } = await params;
  if (!validPanelRoute(panel, section)) notFound();
  if (!section.length) redirect("/" + panel + "/app");
  if (section[0] === "app") return <PanelEntry panel={panel as PanelKey} />;
  return (
    <Workspace
      role={panelRole(panel)!}
      section={section[0] || "dashboard"}
      detailId={section[1]}
    />
  );
}
