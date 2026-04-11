import { withSentryConfig } from "@sentry/nextjs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  output: "standalone",

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@jobfindeer/api",
    "@jobfindeer/auth",
    "@jobfindeer/db",
    "@jobfindeer/ui",
    "@jobfindeer/validators",
  ],

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
};

export default withSentryConfig(config, {
  silent: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
