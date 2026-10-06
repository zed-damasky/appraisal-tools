import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import path from "path";
import os from "os";
import { ensureAppStructure, getSettings } from "./services/storage";
import { settingsRoutes } from "./modules/settings/routes";
import authRoutes from "./modules/auth";
import { filesystemRoutes } from "./modules/filesystem/routes";
import { filesRoutes } from "./modules/files/routes";
import { contractsRoutes } from "./contracts/routes";
import reportsRouter from "./modules/reports"


const app = new Hono();

app.use("*", logger());

app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:5000"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.route("/api/settings", settingsRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/filesystem", filesystemRoutes);
app.route("/api/contracts", contractsRoutes);
app.route("/api/reports", reportsRouter);
app.route("/api/reports", filesRoutes);

async function startServer() {
  const baseDir =
    process.env.BASE_DIR ||
    path.join(os.homedir(), "AppData", "Roaming", "AppraisalApp");

  console.log("=> Используемая базовая директория:", baseDir);

  await ensureAppStructure(baseDir);

  const settings = await getSettings(baseDir);
  const port = Number(process.env.SERVER_PORT) || settings.port || 5000;

  Bun.serve({
    port: port,
    fetch: app.fetch,
  });

  console.log(`Server is running on http://localhost:${port}`);
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});