import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { settingsRoutes } from "./routes";
import { ensureAppStructure } from "../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";
import type { Settings } from "@appraisal/types";

const TEMP_DIR = path.join(os.tmpdir(), `appraisal-settings-test-${crypto.randomUUID()}`);

describe("Settings Module API", () => {
  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    delete process.env.BASE_DIR;
  });

  describe("GET /", () => {
    it("должен вернуть настройки по умолчанию", async () => {
      const res = await settingsRoutes.request("/");

      expect(res.status).toBe(200);
      const data = (await res.json()) as Settings;
      expect(data).toHaveProperty("port");
      expect(data).toHaveProperty("theme");
      expect(typeof data.port).toBe("number");
      expect(["light", "dark"]).toContain(data.theme);
    });
  });

  describe("PUT /", () => {
    it("должен успешно обновить настройки", async () => {
      const res = await settingsRoutes.request("/", {
        method: "PUT",
        body: JSON.stringify({ port: 8080, theme: "dark" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as Settings;
      expect(data.port).toBe(8080);
      expect(data.theme).toBe("dark");
    });

    it("должен сохранить настройки и вернуть их при GET", async () => {
      await settingsRoutes.request("/", {
        method: "PUT",
        body: JSON.stringify({ port: 9090, theme: "dark" }),
        headers: { "Content-Type": "application/json" },
      });

      const res = await settingsRoutes.request("/");
      const data = (await res.json()) as Settings;
      expect(data.port).toBe(9090);
      expect(data.theme).toBe("dark");
    });

    it("должен отказать при порте меньше 1024", async () => {
      const res = await settingsRoutes.request("/", {
        method: "PUT",
        body: JSON.stringify({ port: 80, theme: "light" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при порте больше 65535", async () => {
      const res = await settingsRoutes.request("/", {
        method: "PUT",
        body: JSON.stringify({ port: 70000, theme: "light" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при нецелом порте", async () => {
      const res = await settingsRoutes.request("/", {
        method: "PUT",
        body: JSON.stringify({ port: 3000.5, theme: "light" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при невалидной теме", async () => {
      const res = await settingsRoutes.request("/", {
        method: "PUT",
        body: JSON.stringify({ port: 3000, theme: "blue" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при отсутствии поля port", async () => {
      const res = await settingsRoutes.request("/", {
        method: "PUT",
        body: JSON.stringify({ theme: "light" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при отсутствии поля theme", async () => {
      const res = await settingsRoutes.request("/", {
        method: "PUT",
        body: JSON.stringify({ port: 3000 }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при пустом теле запроса", async () => {
      const res = await settingsRoutes.request("/", {
        method: "PUT",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });
  });
});