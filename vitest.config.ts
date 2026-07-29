import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: [
      // `server-only` throws outside React Server Components — stub it out.
      {
        find: "server-only",
        replacement: path.resolve(rootDir, "tests/stubs/server-only.ts"),
      },
      { find: "@", replacement: rootDir },
    ],
  },
});
