import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      main: "./ip_worker.ts",
      miniflare: {
        compatibilityFlags: [
          "nodejs_compat",
          "enable_nodejs_inspector_module",
        ],
        bindings: {
          IPGEOLOCATION_KEY: "test-ipgeolocation-key",
        },
      },
    }),
  ],
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
