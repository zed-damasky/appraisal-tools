import { Hono } from "hono";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());

const port = Number(process.env.PORT) || 3001;

console.log(`Server is running on http://localhost:${port}`);

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

Bun.serve({
  port: port,
  fetch: app.fetch,
});
