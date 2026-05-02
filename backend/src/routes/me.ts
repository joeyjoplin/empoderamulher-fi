import { Hono } from "hono";

import type { AuthVariables } from "../middleware/auth.js";

export const meRoute = new Hono<{ Variables: AuthVariables }>();

meRoute.get("/", (c) => c.json({ data: c.var.persona }));
