import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(here, "../../package.json"));
const tailwindcss = require("@tailwindcss/postcss");

export default {
  plugins: [tailwindcss()],
};
