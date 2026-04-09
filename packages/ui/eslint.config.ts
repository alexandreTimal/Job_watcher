import { defineConfig } from "eslint/config";

import { baseConfig } from "@jobfindeer/eslint-config/base";
import { reactConfig } from "@jobfindeer/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);
