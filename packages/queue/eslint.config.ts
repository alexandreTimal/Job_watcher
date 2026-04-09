import { defineConfig } from "eslint/config";

import { baseConfig } from "@jobfindeer/eslint-config/base";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
);
