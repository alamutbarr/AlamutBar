import { cp } from "node:fs/promises";
import { join } from "node:path";
import { frontendPath, sitePath } from "./site-paths.mjs";

await cp(join(frontendPath, "shared", "public"), join(sitePath, "public"), {
  recursive: true,
  force: true,
});
