export function appHref(path: string) {
  if (process.env.NEXT_PUBLIC_ALAMUT_MULTI_APP === "1") {
    const url = new URL(path, "http://internal");
    const segment = url.pathname.split("/")[1];
    const role =
      segment === "admin"
        ? "admin"
        : ["driver", "owner", "inspector"].includes(segment)
          ? segment
          : url.searchParams.get("role") || "owner";
    const origins: Record<string, string | undefined> = {
      driver: process.env.NEXT_PUBLIC_ALAMUT_DRIVER_URL,
      owner: process.env.NEXT_PUBLIC_ALAMUT_OWNER_URL,
      inspector: process.env.NEXT_PUBLIC_ALAMUT_INSPECTOR_URL,
      operator: process.env.NEXT_PUBLIC_ALAMUT_ADMIN_URL,
      admin: process.env.NEXT_PUBLIC_ALAMUT_ADMIN_URL,
    };
    if (!Object.hasOwn(origins, role)) return origins.owner + path;
    return role === "admin" || role === "operator"
      ? origins[role] + "/django-admin/"
      : origins[role] + path;
  }
  return (process.env.NEXT_PUBLIC_ALAMUT_APP_ORIGIN || "") + path;
}

export function siteHref(path: string) {
  return (process.env.NEXT_PUBLIC_ALAMUT_SITE_ORIGIN || "") + path;
}
