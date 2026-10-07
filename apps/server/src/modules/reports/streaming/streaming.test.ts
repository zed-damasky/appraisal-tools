import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { reportsRouter } from "../index";
import { ensureAppStructure } from "../../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-streaming-test-${crypto.randomUUID()}`,
);

const AUTH_HEADERS = {
  Authorization: "Bearer test-valid-token",
  "Content-Type": "application/json",
};

async function createTestReport() {
  const payload = {
    reportSequenceNumber: "STREAM-001",
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

describe("Report Streaming Module API", () => {
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

  describe("Защита и валидация", () => {
    it("должен вернуть 401 при отсутствии авторизации", async () => {
      const res = await reportsRouter.request(
        `/${testReportId}/stream/some-id`,
      );
      expect(res.status).toBe(401);
    });

    it("должен вернуть 400 для невалидного ID отчёта или файла", async () => {
      const res = await reportsRouter.request(`/invalid/stream/invalid`, {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(400);
    });

    it("должен вернуть 404 для несуществующего отчёта", async () => {
      const fakeId = crypto.randomUUID();
      const res = await reportsRouter.request(`/${fakeId}/stream/${fakeId}`, {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(404);
    });

    it("должен вернуть 404 для несуществующего файла", async () => {
      const fakeId = crypto.randomUUID();
      const res = await reportsRouter.request(
        `/${testReportId}/stream/${fakeId}`,
        {
          headers: { Authorization: "Bearer test" },
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("GET /:reportId/stream/:fileId", () => {
    it("должен успешно отдать загруженное изображение (inline)", async () => {
      // 1. Загружаем файл
      const file = new File(["JPEG DATA"], "test-photo.jpg", {
        type: "image/jpeg",
      });
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await reportsRouter.request(`/${testReportId}/photos`, {
        method: "POST",
        headers: { Authorization: "Bearer test" },
        body: formData,
      });
      expect(uploadRes.status).toBe(201);
      const uploadedFiles = (await uploadRes.json()) as any[];
      const fileId = uploadedFiles[0].id;

      // 2. Запрашиваем стриминг
      const streamRes = await reportsRouter.request(
        `/${testReportId}/stream/${fileId}`,
        {
          headers: { Authorization: "Bearer test" },
        },
      );

      expect(streamRes.status).toBe(200);
      expect(streamRes.headers.get("Content-Type")).toBe("image/jpeg");
      expect(streamRes.headers.get("Content-Disposition")).toContain("inline");
      expect(streamRes.headers.get("Content-Disposition")).toContain(
        "test-photo.jpg",
      );

      const text = await streamRes.text();
      expect(text).toBe("JPEG DATA");
    });

    it("должен успешно отдать PDF-документ (inline)", async () => {
      const file = new File(["PDF DATA"], "contract.pdf", {
        type: "application/pdf",
      });
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await reportsRouter.request(
        `/${testReportId}/documents`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: formData,
        },
      );
      const uploadedFiles = (await uploadRes.json()) as any[];
      const fileId = uploadedFiles[0].id;

      const streamRes = await reportsRouter.request(
        `/${testReportId}/stream/${fileId}`,
        {
          headers: { Authorization: "Bearer test" },
        },
      );

      expect(streamRes.status).toBe(200);
      expect(streamRes.headers.get("Content-Type")).toBe("application/pdf");
      expect(streamRes.headers.get("Content-Disposition")).toContain("inline");
    });

    it("должен отдать Word-документ как вложение (attachment)", async () => {
      const file = new File(["DOCX DATA"], "report.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await reportsRouter.request(
        `/${testReportId}/documents`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: formData,
        },
      );
      const uploadedFiles = (await uploadRes.json()) as any[];
      const fileId = uploadedFiles[0].id;

      const streamRes = await reportsRouter.request(
        `/${testReportId}/stream/${fileId}`,
        {
          headers: { Authorization: "Bearer test" },
        },
      );

      expect(streamRes.status).toBe(200);
      expect(streamRes.headers.get("Content-Disposition")).toContain(
        "attachment",
      );
    });
  });
});
