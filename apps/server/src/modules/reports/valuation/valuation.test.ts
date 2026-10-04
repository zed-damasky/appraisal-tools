import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { reportsRouter } from "../index";
import { ensureAppStructure } from "../../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-valuation-test-${crypto.randomUUID()}`,
);

const AUTH_HEADERS = {
  Authorization: "Bearer test-valid-token",
  "Content-Type": "application/json",
};

async function createTestReport() {
  const payload = {
    reportSequenceNumber: "VAL-001",
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

describe("Valuation Module API", () => {
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
      const res = await reportsRouter.request(`/${testReportId}/valuation`, {
        method: "PATCH",
        body: JSON.stringify({
          reconciliation: {
            finalValue: 1000000,
            currency: "RUB",
            description: "Тест",
          },
        }),
      });
      expect(res.status).toBe(401);
    });

    it("должен вернуть 400 при невалидном формате ID отчёта", async () => {
      const res = await reportsRouter.request(`/invalid-uuid/valuation`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          reconciliation: {
            finalValue: 1000000,
            currency: "RUB",
            description: "Тест",
          },
        }),
      });
      expect(res.status).toBe(400);
    });

    it("должен вернуть 404 для несуществующего отчёта", async () => {
      const res = await reportsRouter.request(
        `/00000000-0000-0000-0000-000000000000/valuation`,
        {
          method: "PATCH",
          headers: AUTH_HEADERS,
          body: JSON.stringify({
            reconciliation: {
              finalValue: 1000000,
              currency: "RUB",
              description: "Тест",
            },
          }),
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /:id/valuation", () => {
    it("должен успешно обновить итоговую стоимость и валюту", async () => {
      const res = await reportsRouter.request(`/${testReportId}/valuation`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          reconciliation: {
            description:
              "Итоговая стоимость определена на основе сравнительного подхода",
            finalValue: 5500000,
            currency: "RUB",
          },
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.reconciliation.finalValue).toBe(5500000);
      expect(data.reconciliation.currency).toBe("RUB");
    });

    it("должен успешно обновить статусы и значения подходов", async () => {
      const res = await reportsRouter.request(`/${testReportId}/valuation`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          approaches: [
            {
              approach: "comparative",
              status: "used",
              calculatedValue: 5500000,
              justification: "Рынок развит",
            },
            {
              approach: "income",
              status: "rejected",
              justification: "Объект не приносит доход",
            },
            {
              approach: "cost",
              status: "not_applicable",
              justification: "Оценивается квартира",
            },
          ],
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.approaches).toHaveLength(3);
      expect(data.approaches[0].status).toBe("used");
      expect(data.approaches[0].calculatedValue).toBe(5500000);
      expect(data.approaches[1].status).toBe("rejected");
    });

    it("должен отказать, если подход 'used', но не указана calculatedValue", async () => {
      const res = await reportsRouter.request(`/${testReportId}/valuation`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          approaches: [
            {
              approach: "comparative",
              status: "used",
              justification: "Рынок развит",
            }, // Нет calculatedValue!
            { approach: "income", status: "rejected" },
            { approach: "cost", status: "not_applicable" },
          ],
        }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Невалидные данные");
      expect(data.error).toContain("расчетную стоимость");
    });

    it("должен отказать при отрицательной итоговой стоимости", async () => {
      const res = await reportsRouter.request(`/${testReportId}/valuation`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          reconciliation: {
            description: "Тест",
            finalValue: -1000,
            currency: "RUB",
          },
        }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Невалидные данные");
    });
  });
});
