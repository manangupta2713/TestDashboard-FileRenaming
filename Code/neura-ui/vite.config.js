import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("./", import.meta.url));
const sharedTestsDir = path.resolve(rootDir, "tests");
const nodeModulesDir = path.resolve(rootDir, "node_modules");
const resolveModule = (relativePath) => path.resolve(rootDir, relativePath);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [rootDir, sharedTestsDir, nodeModulesDir],
    },
    deps: {
      inline: ["@testing-library/user-event"],
    },
  },
  resolve: {
    alias: [
      { find: /^react\/jsx-dev-runtime$/, replacement: resolveModule("node_modules/react/jsx-dev-runtime.js") },
      { find: /^react\/jsx-runtime$/, replacement: resolveModule("node_modules/react/jsx-runtime.js") },
      { find: /^react-dom\/client$/, replacement: resolveModule("node_modules/react-dom/client.js") },
      { find: /^react-dom$/, replacement: resolveModule("node_modules/react-dom/index.js") },
      { find: /^react$/, replacement: resolveModule("node_modules/react/index.js") },
      { find: /^@testing-library\/react$/, replacement: resolveModule("node_modules/@testing-library/react/dist/index.js") },
      { find: /^@testing-library\/user-event$/, replacement: resolveModule("node_modules/@testing-library/user-event/dist/cjs/index.js") },
    ],
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
    include: [
      "src/**/*.{test,spec}.{js,jsx,ts,tsx}",
      "tests/frontend/**/*.{test,spec}.{js,jsx,ts,tsx}",
    ],
    threads: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
})
