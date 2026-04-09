import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@jobfindeer/eslint-config/base";
import { nextjsConfig } from "@jobfindeer/eslint-config/nextjs";
import { reactConfig } from "@jobfindeer/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
