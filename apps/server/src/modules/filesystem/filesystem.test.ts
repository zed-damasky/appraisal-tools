import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { filesystemRoutes } from "./routes";
import { ensureAppStructure } from "../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-filesystem-test-${crypto.randomUUID()}`,
);

const AUTH_HEADERS = {
  Authorization: "Bearer test-valid-token",
  "Content-Type": "application/json",
};

describe("Filesystem Module API", () => {
  let testDir: string;

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    testDir = path.join(TEMP_DIR, "test-workspace");
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    delete process.env.BASE_DIR;
  });

  describe("POST /check", () => {
    it("должен вернуть 401 без авторизации", async () => {
      const res = await filesystemRoutes.request("/check", {
        method: "POST",
        body: JSON.stringify({ path: testDir }),
      });
      expect(res.status).toBe(401);
    });

    it("должен успешно проверить существующую папку", async () => {
      const res = await filesystemRoutes.request("/check", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: testDir }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.exists).toBe(true);
      expect(data.isDirectory).toBe(true);
      expect(data.isWritable).toBe(true);
      expect(data.isReadable).toBe(true);
      expect(data.hasMarker).toBe(false);
    });

    it("должен вернуть ошибку для несуществующей папки", async () => {
      const res = await filesystemRoutes.request("/check", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: path.join(testDir, "nonexistent") }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.exists).toBe(false);
    });

    it("должен отказать при невалидном пути", async () => {
      const res = await filesystemRoutes.request("/check", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: "" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /create-marker", () => {
    it("должен успешно создать маркерный файл", async () => {
      const res = await filesystemRoutes.request("/create-marker", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: testDir }),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.success).toBe(true);
      expect(data.data.version).toBe("1.0");
      expect(data.data.appId).toBeDefined();
    });

    it("должен отказать для несуществующей папки", async () => {
      const res = await filesystemRoutes.request("/create-marker", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: path.join(testDir, "nonexistent") }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /verify-marker", () => {
    it("должен успешно проверить существующий маркер", async () => {
      await filesystemRoutes.request("/create-marker", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: testDir }),
      });

      const res = await filesystemRoutes.request("/verify-marker", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: testDir }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.valid).toBe(true);
      expect(data.data.version).toBe("1.0");
    });

    it("должен вернуть ошибку для папки без маркера", async () => {
      const res = await filesystemRoutes.request("/verify-marker", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: testDir }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.valid).toBe(false);
      expect(data.error).toContain("не найден");
    });
  });

  describe("GET /list", () => {
    it("должен успешно получить список содержимого папки", async () => {
      await fs.writeFile(path.join(testDir, "file1.txt"), "content1");
      await fs.writeFile(path.join(testDir, "file2.txt"), "content2");
      await fs.mkdir(path.join(testDir, "subdir"));

      const res = await filesystemRoutes.request(
        `/list?path=${encodeURIComponent(testDir)}`,
        {
          headers: { Authorization: "Bearer test" },
        },
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.entries).toBeDefined();
      expect(data.entries.length).toBe(3);

      const names = data.entries.map((e: any) => e.name);
      expect(names).toContain("file1.txt");
      expect(names).toContain("file2.txt");
      expect(names).toContain("subdir");
    });

    it("должен отказать при отсутствии параметра path", async () => {
      const res = await filesystemRoutes.request("/list", {
        headers: { Authorization: "Bearer test" },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /open-folder", () => {
    it("должен вернуть 401 без авторизации", async () => {
      const res = await filesystemRoutes.request("/open-folder", {
        method: "POST",
        body: JSON.stringify({ path: testDir }),
      });
      expect(res.status).toBe(401);
    });

    it("должен отказать при пустом пути", async () => {
      const res = await filesystemRoutes.request("/open-folder", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: "" }),
      });
      expect(res.status).toBe(400);
    });

    it("должен отказать для несуществующей папки", async () => {
      const res = await filesystemRoutes.request("/open-folder", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: path.join(testDir, "nonexistent") }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("не существует");
    });

    it("должен отказать, если путь указывает на файл, а не папку", async () => {
      const filePath = path.join(testDir, "some-file.txt");
      await fs.writeFile(filePath, "content");

      const res = await filesystemRoutes.request("/open-folder", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: filePath }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("не является папкой");
    });

    it("должен отказать для системных папок (защита от открытия C:\\Windows)", async () => {
      const forbiddenPath = "C:\\Windows";

      const res = await filesystemRoutes.request("/open-folder", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: forbiddenPath }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("системным папкам");
    });
  });

  describe("POST /open-file", () => {
    it("должен вернуть 401 без авторизации", async () => {
      const res = await filesystemRoutes.request("/open-file", {
        method: "POST",
        body: JSON.stringify({ path: testDir }),
      });
      expect(res.status).toBe(401);
    });

    it("должен отказать при пустом пути", async () => {
      const res = await filesystemRoutes.request("/open-file", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: "" }),
      });
      expect(res.status).toBe(400);
    });

    it("должен отказать для несуществующего файла", async () => {
      const res = await filesystemRoutes.request("/open-file", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: path.join(testDir, "nonexistent.txt") }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("не существует");
    });

    it("должен отказать, если путь указывает на папку, а не файл", async () => {
      const res = await filesystemRoutes.request("/open-file", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ path: testDir }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("не является файлом");
    });
  });
});
