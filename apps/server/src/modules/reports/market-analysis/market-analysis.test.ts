import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { reportsRoutes } from "../routes";
import { ensureAppStructure } from "../../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-market-analysis-test-${crypto.randomUUID()}`,
);

const AUTH_HEADERS = {
  Authorization: "Bearer test-valid-token",
  "Content-Type": "application/json",
};

// Хелпер для создания тестового отчёта
async function createTestReport() {
  const payload = {
    reportSequenceNumber: "MKT-001",
    clientName: "Тестовый Заказчик",
    reportDir: path.join(TEMP_DIR, "reports_base"),
    appraisingContractId: "123e4567-e89b-12d3-a456-426614174000",
  };

  const res = await reportsRoutes.request("/", {
    method: "POST",
    headers: AUTH_HEADERS,
    body: JSON.stringify(payload),
  });

  return (await res.json()) as any;
}

describe("Market Analysis Module API", () => {
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
      const res = await reportsRoutes.request(
        `/${testReportId}/market-analysis`,
        {
          method: "PATCH",
          body: JSON.stringify({ macroAnalysisChapter: [] }),
        },
      );
      expect(res.status).toBe(401);
    });

    it("должен вернуть 400 при невалидном формате ID отчёта", async () => {
      const res = await reportsRoutes.request(`/invalid-uuid/market-analysis`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ macroAnalysisChapter: [] }),
      });
      expect(res.status).toBe(400);
    });

    it("должен вернуть 404 для несуществующего отчёта", async () => {
      const res = await reportsRoutes.request(
        `/00000000-0000-0000-0000-000000000000/market-analysis`,
        {
          method: "PATCH",
          headers: AUTH_HEADERS,
          body: JSON.stringify({ macroAnalysisChapter: [] }),
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /:id/market-analysis", () => {
    it("должен успешно добавить главу макроанализа", async () => {
      const chapterId = "550e8400-e29b-41d4-a716-446655440200";

      const res = await reportsRoutes.request(
        `/${testReportId}/market-analysis`,
        {
          method: "PATCH",
          headers: AUTH_HEADERS,
          body: JSON.stringify({
            macroAnalysisChapter: [
              { id: chapterId, path: "docs/macro_2025.docx" },
            ],
          }),
        },
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;

      expect(data.id).toBeDefined(); // ID самого marketAnalysis должен сохраниться
      expect(data.macroAnalysisChapter).toHaveLength(1);
      expect(data.macroAnalysisChapter[0].id).toBe(chapterId);
      expect(data.macroAnalysisChapter[0].path).toBe("docs/macro_2025.docx");

      // Остальные разделы должны остаться пустыми массивами (по умолчанию)
      expect(data.nhueChapter).toEqual([]);
      expect(data.liquidityChapter).toEqual([]);
    });

    it("должен успешно обновить несколько разделов одновременно", async () => {
      const res = await reportsRoutes.request(
        `/${testReportId}/market-analysis`,
        {
          method: "PATCH",
          headers: AUTH_HEADERS,
          body: JSON.stringify({
            macroAnalysisChapter: [
              {
                id: "550e8400-e29b-41d4-a716-446655440201",
                path: "docs/macro.docx",
              },
            ],
            nhueChapter: [
              {
                id: "550e8400-e29b-41d4-a716-446655440202",
                path: "docs/nhue.docx",
              },
            ],
            liquidityChapter: [
              {
                id: "550e8400-e29b-41d4-a716-446655440203",
                path: "docs/liquidity.docx",
              },
            ],
          }),
        },
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;

      expect(data.macroAnalysisChapter).toHaveLength(1);
      expect(data.nhueChapter).toHaveLength(1);
      expect(data.liquidityChapter).toHaveLength(1);
    });

    it("должен сохранить существующие данные при частичном обновлении", async () => {
      // Сначала добавляем макроанализ
      await reportsRoutes.request(`/${testReportId}/market-analysis`, {
        method: "PATCH",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          macroAnalysisChapter: [
            {
              id: "550e8400-e29b-41d4-a716-446655440204",
              path: "docs/macro.docx",
            },
          ],
        }),
      });

      // Затем обновляем только ННЭИ
      const res = await reportsRoutes.request(
        `/${testReportId}/market-analysis`,
        {
          method: "PATCH",
          headers: AUTH_HEADERS,
          body: JSON.stringify({
            nhueChapter: [
              {
                id: "550e8400-e29b-41d4-a716-446655440205",
                path: "docs/nhue.docx",
              },
            ],
          }),
        },
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;

      // Макроанализ должен сохраниться
      expect(data.macroAnalysisChapter).toHaveLength(1);
      expect(data.macroAnalysisChapter[0].path).toBe("docs/macro.docx");

      // ННЭИ должен добавиться
      expect(data.nhueChapter).toHaveLength(1);
      expect(data.nhueChapter[0].path).toBe("docs/nhue.docx");
    });

    it("должен отказать при невалидных данных (пустой путь к файлу)", async () => {
      const res = await reportsRoutes.request(
        `/${testReportId}/market-analysis`,
        {
          method: "PATCH",
          headers: AUTH_HEADERS,
          body: JSON.stringify({
            macroAnalysisChapter: [
              { id: "550e8400-e29b-41d4-a716-446655440206", path: "" }, // Пустая строка не пройдёт валидацию .min(1)
            ],
          }),
        },
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Невалидные данные");
    });

    it("должен отказать при невалидном UUID внутри главы", async () => {
      const res = await reportsRoutes.request(
        `/${testReportId}/market-analysis`,
        {
          method: "PATCH",
          headers: AUTH_HEADERS,
          body: JSON.stringify({
            macroAnalysisChapter: [
              { id: "invalid-uuid", path: "docs/test.docx" },
            ],
          }),
        },
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Невалидные данные");
    });
  });
});
