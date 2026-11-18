import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { standaloneSitePath } from "./site-paths.mjs";

process.env.PORT ||= "3001";
process.env.HOSTNAME ||= "127.0.0.1";
process.env.NEXT_TELEMETRY_DISABLED = "1";
await import(pathToFileURL(join(standaloneSitePath, "server.js")).href);
