import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const frontendPath = fileURLToPath(new URL("../", import.meta.url));
export const sitePath = join(frontendPath, "apps", "site");
export const standaloneSitePath = join(
  sitePath,
  ".next",
  "standalone",
  "apps",
  "site",
);
