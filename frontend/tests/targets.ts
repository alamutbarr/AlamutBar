export const multiApp = process.env.E2E_MULTI_APP !== "0";
export const siteOrigin = process.env.E2E_BASE_URL || "http://127.0.0.1:3001";
const targets: Record<string, string> = {
  driver: process.env.E2E_DRIVER_URL || "http://driver.localhost:3002",
  owner: process.env.E2E_OWNER_URL || "http://owner.localhost:3003",
  inspector: process.env.E2E_INSPECTOR_URL || "http://inspector.localhost:3004",
  operator: process.env.E2E_ADMIN_URL || "http://admin.localhost:8001",
};
for (const origin of [siteOrigin, ...Object.values(targets)]) {
  const host = new URL(origin).hostname;
  if (
    !(
      host === "127.0.0.1" ||
      host === "localhost" ||
      host.endsWith(".localhost")
    )
  )
    throw new Error(
      "QA creates fictional records and must only target loopback hosts.",
    );
}
export function roleOrigin(role: string) {
  return multiApp
    ? targets[role === "admin" ? "operator" : role] || siteOrigin
    : siteOrigin;
}
export function apiTarget(role: string) {
  const origin = new URL(roleOrigin(role));
  const host = origin.host;
  if (origin.hostname.endsWith(".localhost")) origin.hostname = "127.0.0.1";
  return { baseURL: origin.origin, extraHTTPHeaders: { Host: host } };
}
