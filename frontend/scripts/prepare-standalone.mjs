import { cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { sitePath, standaloneSitePath } from "./site-paths.mjs";

for (const [source, target] of [
  ["public", "public"],
  [".next/static", ".next/static"],
]) {
  const destination = join(standaloneSitePath, target);
  await mkdir(destination, { recursive: true });
  await cp(join(sitePath, source), destination, {
    recursive: true,
    force: true,
  });
}
