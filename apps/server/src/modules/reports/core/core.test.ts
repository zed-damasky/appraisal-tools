import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { reportsRouter } from "../index";
import { ensureAppStructure } from "../../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-core-test-${crypto.randomUUID()}`,
);

const AUTH_HEADERS = {
  Authorization: "Bearer test-valid-token",
  "Content-Type": "application/json",
};

async function createTestReport(overrides = {}) {
  const payload = {
    reportSequenceNumber: "TEST-001",
    clientName: "Тестовый Заказчик",
    reportDir: path.join(TEMP_DIR, "reports_base"),
    appraisingContractId: "123e4567-e89b-12d3-a456-426614174000",
    ...overrides,
  };

  const res = await reportsRouter.request("/", {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify(payload),
  });

  return (await res.json()) as any;
}

describe("Reports Core Module API", () => {
  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    delete process.env.BASE_DIR;
  });

  describe("Защита эндпоинтов", () => {
    it("должен вернуть 401 при отсутствии заголовка Authorization", async () => {
      const res = await reportsRouter.request("/");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /", () => {
    it("должен успешно создать новый отчёт и вернуть данные индекса", async () => {
      const payload = {
        reportSequenceNumber: "125/К",
        clientName: "ООО 'Ромашка'",
        reportDir: path.join(TEMP_DIR, "reports_base"),
        appraisingContractId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const res = await reportsRouter.request("/", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;

      expect(data.clientName).toBe("ООО 'Ромашка'");
      expect(data.status).toBe("draft");
      expect(data.title).toBe("125К");
      expect(data.id).toBeDefined();
    });

    it("должен очистить запрещённые символы в номере отчёта", async () => {
      const payload = {
        reportSequenceNumber: "125/<>*?/К",
        clientName: "ООО 'Ромашка'",
        reportDir: path.join(TEMP_DIR, "reports_base"),
        appraisingContractId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const res = await reportsRouter.request("/", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.title).toBe("125К");
    });

    it("должен отказать при невалидных данных", async () => {
      const res = await reportsRouter.request("/", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ clientName: "А" }), // Слишком короткое имя
      });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /", () => {
    it("должен вернуть пустой список, если отчётов нет", async () => {
      const res = await reportsRouter.request("/", {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(0);
    });

    it("должен вернуть список с созданным отчётом", async () => {
      await createTestReport({ clientName: "Иванов И.И." });

      const res = await reportsRouter.request("/", {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];

      expect(data.length).toBeGreaterThan(0);
      expect(data[0].clientName).toBe("Иванов И.И.");
    });

    it("должен фильтровать отчёты по статусу", async () => {
      await createTestReport();

      const res = await reportsRouter.request("/?status=completed", {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(0); // Созданный отчёт имеет статус "draft"
    });
  });

  describe("GET /:id", () => {
    it("должен вернуть полный отчёт по ID", async () => {
      const createdReport = await createTestReport({
        reportSequenceNumber: "125/К",
      });

      const res = await reportsRouter.request(`/${createdReport.id}`, {
        headers: { Authorization: "Bearer test" },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.id).toBe(createdReport.id);
      expect(data.metadata.reportSequenceNumber).toBe("125К");
      expect(data.files.reportDir).toContain("Отчёт_125К_");

      expect(typeof data.marketAnalysis).toBe("object");
      expect(Array.isArray(data.marketAnalysis)).toBe(false);

      expect(data.valuationResults).toBeDefined();
      expect(Array.isArray(data.valuationResults.approaches)).toBe(true);
      expect(data.valuationResults.approaches).toHaveLength(3);
      expect(data.valuationResults.approaches[0].approach).toBe("comparative");
      expect(data.valuationResults.approaches[0].status).toBe("not_applicable");
      expect(data.valuationResults.reconciliation.currency).toBe("RUB");
    });

    it("должен вернуть 404 для несуществующего ID", async () => {
      const res = await reportsRouter.request(
        "/00000000-0000-0000-0000-000000000000",
        { headers: { Authorization: "Bearer test" } },
      );
      expect(res.status).toBe(404);
    });

    it("должен вернуть 400 для невалидного формата ID", async () => {
      const res = await reportsRouter.request("/invalid-uuid", {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /:id", () => {
    it("должен успешно обновить частичные данные отчёта", async () => {
      const createdReport = await createTestReport();

      const res = await reportsRouter.request(`/${createdReport.id}`, {
        method: "PUT",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ status: "in_progress" }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.status).toBe("in_progress");
    });
  });

  describe("PATCH /:id/status", () => {
    it("должен успешно изменить статус отчёта", async () => {
      const createdReport = await createTestReport();

      const res = await reportsRouter.request(`/${createdReport.id}/status`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ status: "review" }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.status).toBe("review");
    });

    it("должен отказать при невалидном статусе", async () => {
      const createdReport = await createTestReport();

      const res = await reportsRouter.request(`/${createdReport.id}/status`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ status: "invalid_status_xyz" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /:id/duplicate", () => {
    it("должен успешно дублировать отчёт с пометкой '(копия)'", async () => {
      const createdReport = await createTestReport({
        reportSequenceNumber: "DUP-1",
      });

      const res = await reportsRouter.request(
        `/${createdReport.id}/duplicate`,
        {
          method: "POST",
          headers: { Authorization: "Bearer test" },
        },
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;

      expect(data.id).not.toBe(createdReport.id);
      expect(data.title).toContain("(копия)");
      expect(data.status).toBe("draft");
    });
  });

  describe("DELETE /:id", () => {
    it("должен успешно удалить отчёт и запись в индексе", async () => {
      const createdReport = await createTestReport();

      const deleteRes = await reportsRouter.request(`/${createdReport.id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer test" },
      });
      expect(deleteRes.status).toBe(200);

      const getRes = await reportsRouter.request(`/${createdReport.id}`, {
        headers: { Authorization: "Bearer test" },
      });
      expect(getRes.status).toBe(404);

      const listRes = await reportsRouter.request("/", {
        headers: { Authorization: "Bearer test" },
      });
      const listData = (await listRes.json()) as any[];
      expect(listData.find((r) => r.id === createdReport.id)).toBeUndefined();
    });
  });
});
