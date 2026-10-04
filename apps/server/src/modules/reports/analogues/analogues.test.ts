import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { reportsRoutes } from "../routes";
import { ensureAppStructure } from "../../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-analogues-test-${crypto.randomUUID()}`,
);

const AUTH_HEADERS = {
  Authorization: "Bearer test-valid-token",
  "Content-Type": "application/json",
};

async function createTestReport() {
  const payload = {
    reportSequenceNumber: "ANALOG-001",
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

function createMockAnalogue(id: string) {
  return {
    id,
    objectType: "immovable_property",
    subtype: "land_plot",
    name: "Тестовый аналог участка",
    visualInspection: {
      visualInspectionType: "without_visual_inspection",
      description:
        "Оценка проведена заочно на основании данных из открытых источников",
    },
    appraisalDate: "2024-01-01",

    totalArea: 600,
    locationAddress: "г. Москва, ул. Тестовая, д. 1",

    rightsOnAnalogue:
      "Собственность, 50:08:0070356:397-50/422/2022-3 от 13.12.2022",
    restrictionsOnAnalogue:
      "Ипотека в силу закона № 50:08:0070356:397-50/422/2022-4 от 13.12.2022",

    locationCharacteristics: {
      latitude: 55.75,
      longitude: 37.61,
      country: "Россия",
      subjectCountry: "Москва",
      nearestHighway: "ул. Тверская",
      roadAccess: "Асфальт",
      ecologicalSituation: "favorable",
      transportAccess: "Хорошая",
      infrastructureObjects: [{ name: "Школа", description: "500м" }],
    },
    depreciation: {
      physicalDepreciation: 0,
      functionalDepreciation: 0,
      externalEconomicDepreciation: 0,
    },
    categoryLand: "Земли населенных пунктов",
    purposeUseLand: "Для ИЖС",
    relief: "Ровный",
    formLandPlot: "Правильная",
    communications: {
      coldWater: "Центр",
      hotWater: "Центр",
      sewerage: "Центр",
      heating: "Центр",
      electricity: "Центр",
      gas: "Центр",
    },
    hasStructures: false,
    hasBuildings: false,

    offerDate: "2024-05-01",
    sourceLocalPath: "docs/screen1.png",
    offerPrice: 1500000,
    contactPhone: "8 906 382-57-37",
  };
}

describe("Analogues Module API", () => {
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

  describe("Защита эндпоинтов", () => {
    it("должен вернуть 401 при отсутствии авторизации на всех маршрутах", async () => {
      const routes = [
        { method: "GET", path: `/${testReportId}/analogues` },
        {
          method: "GET",
          path: `/${testReportId}/analogues/550e8400-e29b-41d4-a716-446655440100`,
        },
        { method: "POST", path: `/${testReportId}/analogues`, body: {} },
        {
          method: "PUT",
          path: `/${testReportId}/analogues/550e8400-e29b-41d4-a716-446655440100`,
          body: {},
        },
        {
          method: "DELETE",
          path: `/${testReportId}/analogues/550e8400-e29b-41d4-a716-446655440100`,
        },
      ];

      for (const route of routes) {
        const res = await reportsRoutes.request(route.path, {
          method: route.method as any,
          body: route.body ? JSON.stringify(route.body) : undefined,
        });
        expect(res.status).toBe(401);
      }
    });
  });

  describe("GET /:id/analogues", () => {
    it("должен вернуть пустой массив, если аналогов нет", async () => {
      const res = await reportsRoutes.request(`/${testReportId}/analogues`, {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toEqual([]);
    });

    it("должен вернуть список добавленных аналогов", async () => {
      const analogue = createMockAnalogue(
        "550e8400-e29b-41d4-a716-446655440100",
      );

      const postRes = await reportsRoutes.request(
        `/${testReportId}/analogues`,
        {
          method: "POST",
          headers: AUTH_HEADERS,
          body: JSON.stringify(analogue),
        },
      );
      expect(postRes.status).toBe(201);

      const res = await reportsRoutes.request(`/${testReportId}/analogues`, {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe("550e8400-e29b-41d4-a716-446655440100");
      expect(data[0].rightsOnAnalogue).toBe(
        "Собственность, 50:08:0070356:397-50/422/2022-3 от 13.12.2022",
      );
    });
  });

  describe("GET /:id/analogues/:analogueId", () => {
    it("должен вернуть конкретный аналог по ID", async () => {
      const analogue = createMockAnalogue(
        "550e8400-e29b-41d4-a716-446655440101",
      );

      const postRes = await reportsRoutes.request(
        `/${testReportId}/analogues`,
        {
          method: "POST",
          headers: AUTH_HEADERS,
          body: JSON.stringify(analogue),
        },
      );
      expect(postRes.status).toBe(201);

      const res = await reportsRoutes.request(
        `/${testReportId}/analogues/550e8400-e29b-41d4-a716-446655440101`,
        { headers: { Authorization: "Bearer test" } },
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.id).toBe("550e8400-e29b-41d4-a716-446655440101");
      expect(data.offerPrice).toBe(1500000);
    });

    it("должен вернуть 404 для несуществующего аналога", async () => {
      const res = await reportsRoutes.request(
        `/${testReportId}/analogues/00000000-0000-0000-0000-000000000000`,
        { headers: { Authorization: "Bearer test" } },
      );
      expect(res.status).toBe(404);
    });

    it("должен вернуть 400 при невалидном формате ID", async () => {
      const res = await reportsRoutes.request(
        `/${testReportId}/analogues/invalid-uuid`,
        { headers: { Authorization: "Bearer test" } },
      );
      expect(res.status).toBe(400);
    });
  });

  describe("POST /:id/analogues", () => {
    it("должен успешно добавить новый аналог", async () => {
      const analogue = createMockAnalogue(
        "550e8400-e29b-41d4-a716-446655440102",
      );

      const res = await reportsRoutes.request(`/${testReportId}/analogues`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(analogue),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.offerPrice).toBe(1500000);
      expect(data.sourceLocalPath).toBe("docs/screen1.png");
      expect(data.restrictionsOnAnalogue).toBe(
        "Ипотека в силу закона № 50:08:0070356:397-50/422/2022-4 от 13.12.2022",
      );
    });

    it("должен отказать при невалидных данных (отсутствует offerPrice)", async () => {
      const invalidAnalogue = {
        ...createMockAnalogue("550e8400-e29b-41d4-a716-446655440103"),
      };
      delete (invalidAnalogue as any).offerPrice;

      const res = await reportsRoutes.request(`/${testReportId}/analogues`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(invalidAnalogue),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Невалидные данные");
    });

    it("должен отказать при добавлении аналога с дублирующимся ID", async () => {
      const analogue = createMockAnalogue(
        "550e8400-e29b-41d4-a716-446655440104",
      );

      await reportsRoutes.request(`/${testReportId}/analogues`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(analogue),
      });

      const res = await reportsRoutes.request(`/${testReportId}/analogues`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(analogue), // Тот же ID
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("уже существует");
    });
  });

  describe("PUT /:id/analogues/:analogueId", () => {
    it("должен успешно обновить данные аналога", async () => {
      const analogue = createMockAnalogue(
        "550e8400-e29b-41d4-a716-446655440105",
      );

      await reportsRoutes.request(`/${testReportId}/analogues`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(analogue),
      });

      const res = await reportsRoutes.request(
        `/${testReportId}/analogues/550e8400-e29b-41d4-a716-446655440105`,
        {
          method: "PUT",
          headers: AUTH_HEADERS,
          body: JSON.stringify({
            offerPrice: 2000000,
            contactPhone: "+79990000000",
            restrictionsOnAnalogue: "Не зарегистрировано",
          }),
        },
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.offerPrice).toBe(2000000);
      expect(data.contactPhone).toBe("+79990000000");
      expect(data.restrictionsOnAnalogue).toBe("Не зарегистрировано");
      expect(data.sourceLocalPath).toBe("docs/screen1.png");
    });

    it("должен вернуть 404 при обновлении несуществующего аналога", async () => {
      const res = await reportsRoutes.request(
        `/${testReportId}/analogues/00000000-0000-0000-0000-000000000000`,
        {
          method: "PUT",
          headers: AUTH_HEADERS,
          body: JSON.stringify({ offerPrice: 1000000 }),
        },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /:id/analogues/:analogueId", () => {
    it("должен успешно удалить аналог", async () => {
      const analogue = createMockAnalogue(
        "550e8400-e29b-41d4-a716-446655440106",
      );

      await reportsRoutes.request(`/${testReportId}/analogues`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(analogue),
      });

      const deleteRes = await reportsRoutes.request(
        `/${testReportId}/analogues/550e8400-e29b-41d4-a716-446655440106`,
        { method: "DELETE", headers: { Authorization: "Bearer test" } },
      );
      expect(deleteRes.status).toBe(200);

      const getRes = await reportsRoutes.request(
        `/${testReportId}/analogues/550e8400-e29b-41d4-a716-446655440106`,
        { headers: { Authorization: "Bearer test" } },
      );
      expect(getRes.status).toBe(404);
    });

    it("должен вернуть 404 при удалении несуществующего аналога", async () => {
      const res = await reportsRoutes.request(
        `/${testReportId}/analogues/00000000-0000-0000-0000-000000000000`,
        { method: "DELETE", headers: { Authorization: "Bearer test" } },
      );
      expect(res.status).toBe(404);
    });
  });
});
