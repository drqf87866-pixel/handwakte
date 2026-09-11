import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Test-Setup: Node-Environment (kein jsdom), `@/`-Alias wie in tsconfig.json.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
