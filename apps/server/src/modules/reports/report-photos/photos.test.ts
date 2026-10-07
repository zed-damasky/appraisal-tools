import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { reportsRouter } from "../index";
import { ensureAppStructure } from "../../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-report-photos-test-${crypto.randomUUID()}`,
);

const AUTH_HEADERS = {
  Authorization: "Bearer test-valid-token",
  "Content-Type": "application/json",
};

function createMockFile(
  name: string,
  content: Uint8Array | string,
  type: string,
): File {
  const data =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  return new File([data], name, { type });
}

async function createTestReport() {
  const payload = {
    reportSequenceNumber: "PHOTO-001",
    clientName: "Тестовый Заказчик",
    reportDir: path.join(TEMP_DIR, "reports_base"),
    appraisingContractId: "123e4567-e89b-12d3-a456-426614174000",
  };

  const res = await reportsRouter.request("/", {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify(payload),
  });

  return (await res.json()) as any;
}

describe("Report Photos Module API", () => {
  let testReportId: string;
  let testReportDir: string;

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    const report = await createTestReport();
    testReportId = report.id;
    testReportDir = report.reportDir;
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    delete process.env.BASE_DIR;
  });

  describe("Защита эндпоинтов", () => {
    it("должен вернуть 401 при отсутствии авторизации на GET", async () => {
      const res = await reportsRouter.request(`/${testReportId}/photos`);
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на POST", async () => {
      const formData = new FormData();
      const file = createMockFile("test.jpg", "content", "image/jpeg");
      formData.append("file", file);

      const res = await reportsRouter.request(`/${testReportId}/photos`, {
        method: "POST",
        body: formData,
      });
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на DELETE", async () => {
      const res = await reportsRouter.request(
        `/${testReportId}/photos/${crypto.randomUUID()}`,
        { method: "DELETE" },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /:id/photos", () => {
    it("должен вернуть пустой массив, если фотографий нет", async () => {
      const res = await reportsRouter.request(`/${testReportId}/photos`, {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toEqual([]);
    });

    it("должен вернуть список загруженных фотографий", async () => {
      const file = createMockFile("facade.jpg", "JPEG data", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      await reportsRouter.request(`/${testReportId}/photos`, {
        method: "POST",
        headers: { Authorization: "Bearer test" },
        body: formData,
      });

      const res = await reportsRouter.request(`/${testReportId}/photos`, {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("facade.jpg");
      expect(data[0].mimeType).toBe("image/jpeg");
    });

    it("должен вернуть 404 для несуществующего отчёта", async () => {
      const res = await reportsRouter.request(
        `/00000000-0000-0000-0000-000000000000/photos`,
        { headers: { Authorization: "Bearer test" } },
      );
      expect(res.status).toBe(404);
    });

    it("должен вернуть 400 для невалидного ID отчёта", async () => {
      const res = await reportsRouter.request(`/invalid-uuid/photos`, {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /:id/photos", () => {
    it("должен успешно загрузить JPEG-фотографию", async () => {
      const file = createMockFile("facade.jpg", "JPEG data", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(`/${testReportId}/photos`, {
        method: "POST",
        headers: { Authorization: "Bearer test" },
        body: formData,
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("facade.jpg");
      expect(data[0].mimeType).toBe("image/jpeg");
      expect(data[0].path).toMatch(/^фото\/[a-f0-9-]+\.jpg$/);
    });

    it("должен успешно загрузить PNG-фотографию", async () => {
      const file = createMockFile("plan.png", "PNG data", "image/png");
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(`/${testReportId}/photos`, {
        method: "POST",
        headers: { Authorization: "Bearer test" },
        body: formData,
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].mimeType).toBe("image/png");
    });

    it("должен успешно загрузить WEBP-фотографию", async () => {
      const file = createMockFile("room.webp", "WEBP data", "image/webp");
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(`/${testReportId}/photos`, {
        method: "POST",
        headers: { Authorization: "Bearer test" },
        body: formData,
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].mimeType).toBe("image/webp");
    });

    it("должен успешно загрузить фотографию в подпапку", async () => {
      const file = createMockFile("kitchen.jpg", "JPEG data", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(
        `/${testReportId}/photos?folder=Интерьер`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: formData,
        },
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].path).toMatch(/^фото\/Интерьер\/[a-f0-9-]+\.jpg$/);

      const folderPath = path.join(testReportDir, "фото", "Интерьер");
      const folderExists = await fs
        .stat(folderPath)
        .then(() => true)
        .catch(() => false);
      expect(folderExists).toBe(true);
    });

    it("должен отказать при загрузке PDF (не изображение)", async () => {
      const file = createMockFile("doc.pdf", "PDF content", "application/pdf");
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(`/${testReportId}/photos`, {
        method: "POST",
        headers: { Authorization: "Bearer test" },
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Неподдерживаемый тип");
    });

    it("должен отказать при загрузке DOCX (не изображение)", async () => {
      const file = createMockFile(
        "doc.docx",
        "DOCX content",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(`/${testReportId}/photos`, {
        method: "POST",
        headers: { Authorization: "Bearer test" },
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Неподдерживаемый тип");
    });

    it("должен отказать при path traversal в имени папки", async () => {
      const file = createMockFile("test.jpg", "content", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(
        `/${testReportId}/photos?folder=..\\..\\etc`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: formData,
        },
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Недопустимое имя папки");
    });

    it("должен отказать, если файл не передан", async () => {
      const formData = new FormData();

      const res = await reportsRouter.request(`/${testReportId}/photos`, {
        method: "POST",
        headers: { Authorization: "Bearer test" },
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("не передан");
    });

    it("должен отказать для несуществующего отчёта", async () => {
      const file = createMockFile("test.jpg", "content", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(
        `/00000000-0000-0000-0000-000000000000/photos`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: formData,
        },
      );

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /:id/photos/:photoId", () => {
    it("должен успешно удалить запись о фотографии (файл остаётся на диске)", async () => {
      const file = createMockFile("test.jpg", "JPEG data", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await reportsRouter.request(`/${testReportId}/photos`, {
        method: "POST",
        headers: { Authorization: "Bearer test" },
        body: formData,
      });
      expect(uploadRes.status).toBe(201);

      const uploadData = (await uploadRes.json()) as any[];
      const photoId = uploadData[0].id;
      const relativePath = uploadData[0].path;
      const absolutePath = path.join(testReportDir, relativePath);

      const fileExistsBefore = await fs
        .stat(absolutePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExistsBefore).toBe(true);

      const deleteRes = await reportsRouter.request(
        `/${testReportId}/photos/${photoId}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer test" },
        },
      );
      expect(deleteRes.status).toBe(200);

      const listRes = await reportsRouter.request(`/${testReportId}/photos`, {
        headers: { Authorization: "Bearer test" },
      });
      const listData = (await listRes.json()) as any[];
      expect(listData).toHaveLength(0);

      const fileExistsAfter = await fs
        .stat(absolutePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExistsAfter).toBe(true);
    });

    it("должен вернуть 404 при удалении несуществующей фотографии", async () => {
      const res = await reportsRouter.request(
        `/${testReportId}/photos/${crypto.randomUUID()}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer test" },
        },
      );
      expect(res.status).toBe(404);
    });

    it("должен вернуть 404 для несуществующего отчёта", async () => {
      const res = await reportsRouter.request(
        `/00000000-0000-0000-0000-000000000000/photos/${crypto.randomUUID()}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer test" },
        },
      );
      expect(res.status).toBe(404);
    });
  });
});
