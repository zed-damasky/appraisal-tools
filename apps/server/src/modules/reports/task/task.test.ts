import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { reportsRouter } from "../index";
import { ensureAppStructure } from "../../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-task-test-${crypto.randomUUID()}`,
);

const AUTH_HEADERS = {
  Authorization: "Bearer test-valid-token",
  "Content-Type": "application/json",
};

async function createTestReport() {
  const payload = {
    reportSequenceNumber: "TASK-001",
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

describe("Task Module API", () => {
  let testReportId: string;

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    const report = await createTestReport();
    testReportId = report.id;
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    delete process.env.BASE_DIR;
  });

  describe("Защита и валидация эндпоинтов", () => {
    it("должен вернуть 401 при отсутствии авторизации", async () => {
      const res = await reportsRouter.request(`/${testReportId}/task`, {
        method: "PATCH",
        body: JSON.stringify({ appraisingPurpose: "Тест" }),
      });
      expect(res.status).toBe(401);
    });

    it("должен вернуть 400 при невалидном формате ID отчёта", async () => {
      const res = await reportsRouter.request(`/invalid-uuid/task`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ appraisingPurpose: "Тест" }),
      });
      expect(res.status).toBe(400);
    });

    it("должен вернуть 404 для несуществующего отчёта", async () => {
      const res = await reportsRouter.request(
        `/00000000-0000-0000-0000-000000000000/task`,
        {
          method: "PATCH",
          headers: AUTH_HEADERS,
          body: JSON.stringify({ appraisingPurpose: "Тест" }),
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /:id/task", () => {
    it("должен успешно обновить цель оценки", async () => {
      const res = await reportsRouter.request(`/${testReportId}/task`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ appraisingPurpose: "Оценка для ипотеки" }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;

      expect(data.appraisingPurpose).toBe("Оценка для ипотеки");
      expect(data.id).toBeDefined(); // ID самого задания должен сохраниться
    });

    it("должен успешно обновить дату осмотра и дополнительные исследования", async () => {
      const res = await reportsRouter.request(`/${testReportId}/task`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          inspectionDate: "2024-05-20",
          additionalResearch: "Требуется анализ рынка аренды",
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;

      expect(data.inspectionDate).toBe("2024-05-20");
      expect(data.additionalResearch).toBe("Требуется анализ рынка аренды");
    });

    it("должен сохранить существующие данные при частичном обновлении", async () => {
      await reportsRouter.request(`/${testReportId}/task`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ appraisingPurpose: "Для залога в банке" }),
      });

      const res = await reportsRouter.request(`/${testReportId}/task`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ inspectionDate: "2024-06-01" }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;

      expect(data.appraisingPurpose).toBe("Для залога в банке");
      expect(data.inspectionDate).toBe("2024-06-01");
    });

    it("должен отказать при невалидных данных (пустая цель оценки)", async () => {
      const res = await reportsRouter.request(`/${testReportId}/task`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ appraisingPurpose: "" }), // Нарушает .min(1) в схеме
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Невалидные данные");
    });

    it("должен отказать при невалидном формате даты осмотра", async () => {
      const res = await reportsRouter.request(`/${testReportId}/task`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ inspectionDate: "не-дата" }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Невалидные данные");
    });
  });
});
