import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Standalone unit-test config: plain jsdom, no TanStack Start plugins. */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
