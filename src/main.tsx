// MUST be the first import — installs `globalThis.process` (with
// `nextTick`) before any other module evaluates. See polyfills.ts.
import "./polyfills";

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
