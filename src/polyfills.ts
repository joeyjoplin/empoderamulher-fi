/**
 * Install Node-style globals BEFORE Web3Auth (and other crypto SDKs) load.
 *
 * Why this exists and not just `vite-plugin-node-polyfills`:
 *
 * Web3Auth's wallet-services iframe (`@web3auth/ws-embed`) ships as a
 * pre-bundled chunk. Its bundler aliased `process` → `process2` at build
 * time, so at runtime `process2.nextTick(...)` is called on whatever
 * `globalThis.process` happens to be. The polyfill plugin installs a
 * stripped-down `process` shim (just `process.env`) that lacks `nextTick`,
 * so the iframe crashes mid-handshake.
 *
 * Importing the full `process/browser` package and pinning it to
 * `globalThis.process` here — at the top of `main.tsx`, before any other
 * import — guarantees Web3Auth sees the complete polyfill (with
 * `nextTick`, `version`, `versions`, etc.).
 *
 * Buffer gets the same treatment for parity with the older crypto deps
 * pulled in transitively by the SDK.
 */

import process from "process/browser";
import { Buffer } from "buffer";

declare global {
  // The full Node process shape isn't worth modelling; readable-stream only
  // uses `nextTick`, and the rest of Web3Auth doesn't crash on missing props.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var process: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var Buffer: any;
}

if (typeof globalThis.process === "undefined" || typeof globalThis.process.nextTick !== "function") {
  globalThis.process = process;
}
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}
