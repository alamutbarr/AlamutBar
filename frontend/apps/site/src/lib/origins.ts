export function deploymentOrigins() {
  const site = new URL(process.env.SITE_URL || "http://127.0.0.1:3001");
  const configured = process.env.APP_URL?.trim();
  if (!configured) return { site, app: null };

  const app = new URL(configured);
  if (
    site.protocol !== "https:" ||
    app.protocol !== "https:" ||
    site.hostname === app.hostname ||
    site.href !== site.origin + "/" ||
    app.href !== app.origin + "/"
  ) {
    throw new Error(
      "SITE_URL and APP_URL must be HTTPS origins with distinct hostnames.",
    );
  }
  return { site, app };
}
