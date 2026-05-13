import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    // Use the array form so we can pin aliases to exact-match RegExps.
    // The string form ("process": "process/browser") does prefix
    // substitution, which mangles `process/browser` → `process/browser/browser`
    // and breaks readable-stream's `require('process/')` (it becomes
    // `require('process/browser/')`). Pinning the find pattern to exactly
    // `process` or `process/` (with optional trailing slash) keeps
    // `process/browser` itself unaffected.
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      {
        find: /^process\/?$/,
        replacement: path.resolve(__dirname, "./node_modules/process/browser.js"),
      },
    ],
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  optimizeDeps: {
    // Force Vite to pre-bundle the buffer polyfill so it resolves
    // consistently on first load. `process/browser` is handled by the
    // alias above (absolute path) so it doesn't need to be listed here.
    include: ["buffer"],
  },
  define: {
    // Belt-and-suspenders: many crypto SDKs reference `global.X` directly
    // (instead of `globalThis.X`), assuming they're running in Node. This
    // tells Vite/esbuild to swap `global` references for `globalThis` so
    // the runtime polyfills installed in src/polyfills.ts are visible.
    global: "globalThis",
  },
}));
