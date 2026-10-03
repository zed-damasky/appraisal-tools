import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { filesRoutes } from "./routes";
import { reportsRoutes } from "../../../../../.backup/__routes";
import { ensureAppStructure } from "../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { existsSync } from "fs";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-files-test-${crypto.randomUUID()}`,
);

const AUTH_HEADERS = {
  Authorization: "Bearer test-valid-token",
};

async function createTestReport() {
  const payload = {
    reportSequenceNumber: "TEST-001",
    clientName: "Тестовый Заказчик",
    reportDir: path.join(TEMP_DIR, "reports_base"),
    appraisingContractId: "123e4567-e89b-12d3-a456-426614174000",
  };

  const res = await reportsRoutes.request("/", {
    method: "POST",
    headers: { ...AUTH_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return (await res.json()) as any;
}

function createMockFile(content: string, name: string, type: string): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

describe("Files Module API", () => {
  let testReport: any;
  let testReportId: string;
  let testReportDir: string;

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    testReport = await createTestReport();
    testReportId = testReport.id;
    testReportDir = testReport.reportDir;
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    delete process.env.BASE_DIR;
  });

  describe("Защита эндпоинтов", () => {
    it("должен вернуть 401 при загрузке файла без авторизации", async () => {
      const file = createMockFile("test", "test.jpg", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const res = await filesRoutes.request(`/${testReportId}/files/photos`, {
        method: "POST",
        body: formData,
      });

      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при удалении файла без авторизации", async () => {
      const res = await filesRoutes.request(
        `/${testReportId}/files/photos/test-id`,
        {
          method: "DELETE",
        },
      );

      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при получении файла без авторизации", async () => {
      const res = await filesRoutes.request(
        `/${testReportId}/files/photos/test-id`,
      );
      expect(res.status).toBe(401);
    });
  });

  describe("POST /:reportId/files/:category", () => {
    it("должен успешно загрузить фото (JPEG)", async () => {
      const file = createMockFile(
        "fake jpeg content",
        "photo.jpg",
        "image/jpeg",
      );
      const formData = new FormData();
      formData.append("file", file);

      const res = await filesRoutes.request(`/${testReportId}/files/photos`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: formData,
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.id).toBeDefined();
      expect(data.name).toBe("photo.jpg");
      expect(data.mimeType).toBe("image/jpeg");
      expect(data.path).toContain("photos/");
      expect(data.path).toEndWith(".jpg");
    });

    it("должен успешно загрузить фото (PNG)", async () => {
      const file = createMockFile("fake png content", "image.png", "image/png");
      const formData = new FormData();
      formData.append("file", file);

      const res = await filesRoutes.request(`/${testReportId}/files/photos`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: formData,
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.mimeType).toBe("image/png");
      expect(data.path).toEndWith(".png");
    });

    it("должен успешно загрузить документ (PDF)", async () => {
      const file = createMockFile(
        "fake pdf content",
        "document.pdf",
        "application/pdf",
      );
      const formData = new FormData();
      formData.append("file", file);

      const res = await filesRoutes.request(`/${testReportId}/files/docs`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: formData,
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.mimeType).toBe("application/pdf");
      expect(data.path).toContain("docs/");
      expect(data.path).toEndWith(".pdf");
    });

    it("должен отказать при загрузке PDF в категорию photos", async () => {
      const file = createMockFile("fake pdf", "doc.pdf", "application/pdf");
      const formData = new FormData();
      formData.append("file", file);

      const res = await filesRoutes.request(`/${testReportId}/files/photos`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Недопустимый тип файла");
    });

    it("должен отказать при загрузке запрещённого типа файла", async () => {
      const file = createMockFile(
        "fake exe",
        "virus.exe",
        "application/x-msdownload",
      );
      const formData = new FormData();
      formData.append("file", file);

      const res = await filesRoutes.request(`/${testReportId}/files/docs`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Недопустимый тип файла");
    });

    it("должен отказать при отсутствии файла в запросе", async () => {
      const formData = new FormData();

      const res = await filesRoutes.request(`/${testReportId}/files/photos`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toBe("Файл не найден в запросе");
    });

    it("должен отказать при неверной категории", async () => {
      const file = createMockFile("test", "test.jpg", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const res = await filesRoutes.request(`/${testReportId}/files/invalid`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toBe("Неверная категория");
    });

    it("должен отказать при загрузке в несуществующий отчёт", async () => {
      const file = createMockFile("test", "test.jpg", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const res = await filesRoutes.request(
        `/00000000-0000-0000-0000-000000000000/files/photos`,
        {
          method: "POST",
          headers: AUTH_HEADERS,
          body: formData,
        },
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toBe("Отчёт не найден");
    });

    it("должен создать физический файл на диске", async () => {
      const file = createMockFile("test content", "test.jpg", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const res = await filesRoutes.request(`/${testReportId}/files/photos`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: formData,
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;

      const fullPath = path.join(testReportDir, data.path);
      expect(existsSync(fullPath)).toBe(true);
    });
  });

  describe("GET /:reportId/files/:category/:fileId", () => {
    it("должен успешно отдать загруженный файл", async () => {
      const file = createMockFile(
        "test image content",
        "photo.jpg",
        "image/jpeg",
      );
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await filesRoutes.request(
        `/${testReportId}/files/photos`,
        {
          method: "POST",
          headers: AUTH_HEADERS,
          body: formData,
        },
      );

      const uploadedDoc = (await uploadRes.json()) as any;

      const getRes = await filesRoutes.request(
        `/${testReportId}/files/photos/${uploadedDoc.id}`,
        { headers: AUTH_HEADERS },
      );

      expect(getRes.status).toBe(200);
      expect(getRes.headers.get("Content-Type")).toBe("image/jpeg");
      expect(getRes.headers.get("Content-Disposition")).toContain("photo.jpg");

      const content = await getRes.text();
      expect(content).toBe("test image content");
    });

    it("должен вернуть 404 для несуществующего файла", async () => {
      const res = await filesRoutes.request(
        `/${testReportId}/files/photos/00000000-0000-0000-0000-000000000000`,
        { headers: AUTH_HEADERS },
      );

      expect(res.status).toBe(404);
    });

    it("должен вернуть 400 для неверной категории", async () => {
      const res = await filesRoutes.request(
        `/${testReportId}/files/invalid/test-id`,
        { headers: AUTH_HEADERS },
      );

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /:reportId/files/:category/:fileId", () => {
    it("должен удалить файл из JSON, но оставить физический файл на диске", async () => {
      const file = createMockFile("test content", "test.jpg", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await filesRoutes.request(
        `/${testReportId}/files/photos`,
        {
          method: "POST",
          headers: AUTH_HEADERS,
          body: formData,
        },
      );

      const uploadedDoc = (await uploadRes.json()) as any;
      const fullPath = path.join(testReportDir, uploadedDoc.path);

      expect(existsSync(fullPath)).toBe(true);

      const deleteRes = await filesRoutes.request(
        `/${testReportId}/files/photos/${uploadedDoc.id}`,
        {
          method: "DELETE",
          headers: AUTH_HEADERS,
        },
      );

      expect(deleteRes.status).toBe(200);
      const deleteData = (await deleteRes.json()) as any;
      expect(deleteData.message).toContain("физический файл сохранён на диске");

      expect(existsSync(fullPath)).toBe(true);

      const getRes = await filesRoutes.request(
        `/${testReportId}/files/photos/${uploadedDoc.id}`,
        { headers: AUTH_HEADERS },
      );
      expect(getRes.status).toBe(404);
    });

    it("должен вернуть 404 при удалении несуществующего файла", async () => {
      const res = await filesRoutes.request(
        `/${testReportId}/files/photos/00000000-0000-0000-0000-000000000000`,
        {
          method: "DELETE",
          headers: AUTH_HEADERS,
        },
      );

      expect(res.status).toBe(404);
    });

    it("должен вернуть 400 при неверной категории", async () => {
      const res = await filesRoutes.request(
        `/${testReportId}/files/invalid/test-id`,
        {
          method: "DELETE",
          headers: AUTH_HEADERS,
        },
      );

      expect(res.status).toBe(400);
    });
  });

  describe("Ограничение размера файла", () => {
    it("должен отказать при файле больше 50 МБ", async () => {
      const largeContent = "x".repeat(51 * 1024 * 1024);
      const file = createMockFile(largeContent, "large.jpg", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const res = await filesRoutes.request(`/${testReportId}/files/photos`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toBe("Размер файла превышает 50 МБ");
    });

    it("должен принять файл размером ровно 50 МБ", async () => {
      const content = "x".repeat(50 * 1024 * 1024);
      const file = createMockFile(content, "exactly50mb.jpg", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const res = await filesRoutes.request(`/${testReportId}/files/photos`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: formData,
      });

      expect(res.status).toBe(201);
    });
  });
});
