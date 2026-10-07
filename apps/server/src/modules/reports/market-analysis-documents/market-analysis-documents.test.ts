import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { reportsRouter } from "../index";
import { ensureAppStructure } from "../../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-market-analysis-docs-test-${crypto.randomUUID()}`,
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
    reportSequenceNumber: "MA-001",
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

describe("Market Analysis Documents Module API", () => {
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
      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents`,
      );
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на POST", async () => {
      const formData = new FormData();
      const file = createMockFile("test.pdf", "content", "application/pdf");
      formData.append("file", file);

      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents`,
        { method: "POST", body: formData },
      );
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на DELETE", async () => {
      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents/${crypto.randomUUID()}`,
        { method: "DELETE" },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("Валидация типа главы", () => {
    it("должен вернуть 400 для недопустимого типа главы (GET)", async () => {
      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/invalid-type/documents`,
        { headers: { Authorization: "Bearer test" } },
      );
      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Недопустимый тип главы");
    });

    it("должен вернуть 400 для недопустимого типа главы (POST)", async () => {
      const file = createMockFile("test.pdf", "content", "application/pdf");
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/invalid-type/documents`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: formData,
        },
      );
      expect(res.status).toBe(400);
    });

    it("должен принимать все допустимые типы глав", async () => {
      const types = [
        "macro",
        "region",
        "segment",
        "analogues",
        "nhue",
        "liquidity",
        "conclusions",
      ];

      for (const type of types) {
        const res = await reportsRouter.request(
          `/${testReportId}/market-analysis/${type}/documents`,
          { headers: { Authorization: "Bearer test" } },
        );
        expect(res.status).toBe(200);
      }
    });
  });

  describe("GET /:id/market-analysis/:chapterType/documents", () => {
    it("должен вернуть пустой массив, если документов нет", async () => {
      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents`,
        { headers: { Authorization: "Bearer test" } },
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toEqual([]);
    });

    it("должен вернуть список загруженных документов", async () => {
      const file = createMockFile(
        "macro.pdf",
        "PDF content",
        "application/pdf",
      );
      const formData = new FormData();
      formData.append("file", file);

      await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: formData,
        },
      );

      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents`,
        { headers: { Authorization: "Bearer test" } },
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].fileName).toBe("macro.pdf");
      expect(data[0].path).toMatch(/^анализ_рынка\/[a-f0-9-]+\.pdf$/);
    });

    it("должен вернуть 404 для несуществующего отчёта", async () => {
      const res = await reportsRouter.request(
        `/00000000-0000-0000-0000-000000000000/market-analysis/macro/documents`,
        { headers: { Authorization: "Bearer test" } },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("POST /:id/market-analysis/:chapterType/documents", () => {
    it("должен успешно загрузить PDF-документ", async () => {
      const file = createMockFile(
        "macro-analysis.pdf",
        "PDF content",
        "application/pdf",
      );
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: formData,
        },
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.id).toBeDefined();
      expect(data.fileName).toBe("macro-analysis.pdf");
      expect(data.path).toMatch(/^анализ_рынка\/[a-f0-9-]+\.pdf$/);
    });

    it("должен успешно загрузить DOCX-документ", async () => {
      const file = createMockFile(
        "region.docx",
        "DOCX content",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/region/documents`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: formData,
        },
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.fileName).toBe("region.docx");
    });

    it("должен успешно загрузить документ в подпапку", async () => {
      const file = createMockFile(
        "moscow.pdf",
        "PDF content",
        "application/pdf",
      );
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents?folder=Москва`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: formData,
        },
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.path).toMatch(/^анализ_рынка\/Москва\/[a-f0-9-]+\.pdf$/);

      const folderPath = path.join(testReportDir, "анализ_рынка", "Москва");
      const folderExists = await fs
        .stat(folderPath)
        .then(() => true)
        .catch(() => false);
      expect(folderExists).toBe(true);
    });

    it("должен отказать при загрузке изображения (не Word/PDF)", async () => {
      const file = createMockFile("photo.jpg", "JPEG data", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: formData,
        },
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Неподдерживаемый тип");
    });

    it("должен отказать при path traversal в имени папки", async () => {
      const file = createMockFile("test.pdf", "content", "application/pdf");
      const formData = new FormData();
      formData.append("file", file);

      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents?folder=..\\..\\etc`,
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

      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: formData,
        },
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("не передан");
    });

    it("должен изолировать документы по типам глав", async () => {
      const macroFile = createMockFile(
        "macro.pdf",
        "PDF content",
        "application/pdf",
      );
      const regionFile = createMockFile(
        "region.pdf",
        "PDF content",
        "application/pdf",
      );

      const macroFormData = new FormData();
      macroFormData.append("file", macroFile);
      await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: macroFormData,
        },
      );

      const regionFormData = new FormData();
      regionFormData.append("file", regionFile);
      await reportsRouter.request(
        `/${testReportId}/market-analysis/region/documents`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: regionFormData,
        },
      );

      const macroRes = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents`,
        { headers: { Authorization: "Bearer test" } },
      );
      const macroData = (await macroRes.json()) as any[];
      expect(macroData).toHaveLength(1);
      expect(macroData[0].fileName).toBe("macro.pdf");

      const regionRes = await reportsRouter.request(
        `/${testReportId}/market-analysis/region/documents`,
        { headers: { Authorization: "Bearer test" } },
      );
      const regionData = (await regionRes.json()) as any[];
      expect(regionData).toHaveLength(1);
      expect(regionData[0].fileName).toBe("region.pdf");
    });
  });

  describe("DELETE /:id/market-analysis/:chapterType/documents/:docId", () => {
    it("должен успешно удалить запись о документе (файл остаётся на диске)", async () => {
      const file = createMockFile("test.pdf", "content", "application/pdf");
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
          body: formData,
        },
      );
      expect(uploadRes.status).toBe(201);

      const uploadData = (await uploadRes.json()) as any;
      const docId = uploadData.id;
      const relativePath = uploadData.path;
      const absolutePath = path.join(testReportDir, relativePath);

      const fileExistsBefore = await fs
        .stat(absolutePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExistsBefore).toBe(true);

      const deleteRes = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents/${docId}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer test" },
        },
      );
      expect(deleteRes.status).toBe(200);

      const listRes = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents`,
        { headers: { Authorization: "Bearer test" } },
      );
      const listData = (await listRes.json()) as any[];
      expect(listData).toHaveLength(0);

      const fileExistsAfter = await fs
        .stat(absolutePath)
        .then(() => true)
        .catch(() => false);
      expect(fileExistsAfter).toBe(true);
    });

    it("должен вернуть 404 при удалении несуществующего документа", async () => {
      const res = await reportsRouter.request(
        `/${testReportId}/market-analysis/macro/documents/${crypto.randomUUID()}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer test" },
        },
      );
      expect(res.status).toBe(404);
    });

    it("должен вернуть 404 для несуществующего отчёта", async () => {
      const res = await reportsRouter.request(
        `/00000000-0000-0000-0000-000000000000/market-analysis/macro/documents/${crypto.randomUUID()}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer test" },
        },
      );
      expect(res.status).toBe(404);
    });
  });
});
