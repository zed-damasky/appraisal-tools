import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { reportsRoutes } from "../../../../../../.backup/__routes";
import { ensureAppStructure } from "../../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-objects-test-${crypto.randomUUID()}`,
);

const AUTH_HEADERS = {
  Authorization: "Bearer test-valid-token",
  "Content-Type": "application/json",
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
    headers: AUTH_HEADERS,
    body: JSON.stringify(payload),
  });

  return (await res.json()) as any;
}

function createTestLandPlot(id: string) {
  return {
    id,
    objectType: "immovable_property",
    subtype: "land_plot",
    name: "Тестовый земельный участок",
    visualInspection: {
      visualInspectionType: "full",
      description: "Полный осмотр участка",
    },
    appraisalDate: "2024-01-15",
    technicalDocuments: [
      {
        id: "550e8400-e29b-41d4-a716-446655440001",
        name: "Кадастровый паспорт",
        path: "/docs/cadastre.pdf",
        mimeType: "application/pdf",
        size: 1024,
      },
    ],
    kadNumber: "77:01:0001234:567",
    totalArea: 600,
    locationAddress: "г. Москва, ул. Тестовая, д. 1",
    rights: [
      {
        typeOfRights: "Собственность",
        ownership: "Иванов И.И.",
        dateOfOwnership: "2020-01-01",
        rightsDocuments: [
          {
            id: "550e8400-e29b-41d4-a716-446655440002",
            name: "Выписка ЕГРН",
            path: "/docs/egrn.pdf",
            mimeType: "application/pdf",
            size: 2048,
          },
        ],
        quantityOfRights: "1/1",
        regNumberRights: "77:01:0001234:567",
        regDateRights: "2020-01-01",
        restriction: [],
      },
    ],
    locationCharacteristics: {
      latitude: 55.7558,
      longitude: 37.6173,
      country: "Россия",
      subjectCountry: "Москва",
      nearestHighway: "ул. Тверская",
      roadAccess: "Асфальтированная дорога",
      ecologicalSituation: "favorable",
      transportAccess: "Хорошая транспортная доступность",
      infrastructureObjects: [
        { name: "Школа", description: "500 м" },
        { name: "Магазин", description: "200 м" },
      ],
    },
    depreciation: {
      physicalDepreciation: 0,
      functionalDepreciation: 0,
      externalEconomicDepreciation: 0,
    },
    categoryLand: "Земли населенных пунктов",
    purposeUseLand: "Для ИЖС",
    relief: "Равнинный",
    formLandPlot: "Правильная",
    communications: {
      coldWater: "Центральное",
      hotWater: "Центральное",
      sewerage: "Центральное",
      heating: "Центральное",
      electricity: "Центральное",
      gas: "Центральное",
    },
    hasStructures: false,
    hasBuildings: false,
  };
}

function createTestBuilding(id: string, landPlotId: string) {
  return {
    id,
    objectType: "immovable_property",
    subtype: "building",
    name: "Тестовое здание",
    visualInspection: {
      visualInspectionType: "full",
      description: "Полный осмотр здания",
    },
    appraisalDate: "2024-01-15",
    technicalDocuments: [
      {
        id: "550e8400-e29b-41d4-a716-446655440003",
        name: "Техпаспорт",
        path: "/docs/techpasport.pdf",
        mimeType: "application/pdf",
        size: 3072,
      },
    ],
    kadNumber: "77:01:0001234:568",
    totalArea: 1000,
    locationAddress: "г. Москва, ул. Тестовая, д. 1",
    rights: [
      {
        typeOfRights: "Собственность",
        ownership: "Иванов И.И.",
        dateOfOwnership: "2020-01-01",
        rightsDocuments: [
          {
            id: "550e8400-e29b-41d4-a716-446655440004",
            name: "Выписка ЕГРН",
            path: "/docs/egrn_building.pdf",
            mimeType: "application/pdf",
            size: 2048,
          },
        ],
        quantityOfRights: "1/1",
        regNumberRights: "77:01:0001234:568",
        regDateRights: "2020-01-01",
        restriction: [],
      },
    ],
    locationCharacteristics: {
      latitude: 55.7558,
      longitude: 37.6173,
      country: "Россия",
      subjectCountry: "Москва",
      nearestHighway: "ул. Тверская",
      roadAccess: "Асфальтированная дорога",
      ecologicalSituation: "favorable",
      transportAccess: "Хорошая транспортная доступность",
      infrastructureObjects: [{ name: "Школа", description: "500 м" }],
    },
    depreciation: {
      physicalDepreciation: 10,
      functionalDepreciation: 5,
      externalEconomicDepreciation: 0,
    },
    typeOfBuilding: "living",
    yearOfConstruction: 1990,
    durabilityClass: 2,
    locateLandPlotId: landPlotId,
    aboveFloors: 9,
    undergroundFloors: 1,
    foundation: [
      { id: "550e8400-e29b-41d4-a716-446655440005", name: "Ленточный" },
    ],
    exteriorWalls: [
      { id: "550e8400-e29b-41d4-a716-446655440006", name: "Кирпич" },
    ],
    interiorWalls: [
      { id: "550e8400-e29b-41d4-a716-446655440007", name: "Кирпич" },
    ],
    floorStructures: [
      { id: "550e8400-e29b-41d4-a716-446655440008", name: "ЖБ плиты" },
    ],
    roof: [{ id: "550e8400-e29b-41d4-a716-446655440009", name: "Плоская" }],
    windows: [
      { id: "550e8400-e29b-41d4-a716-446655440010", name: "Деревянные" },
    ],
    exteriorDoors: [
      { id: "550e8400-e29b-41d4-a716-446655440011", name: "Деревянные" },
    ],
    interiorDoors: [
      { id: "550e8400-e29b-41d4-a716-446655440012", name: "Деревянные" },
    ],
    communications: {
      coldWater: "Центральное",
      hotWater: "Центральное",
      sewerage: "Центральное",
      heating: "Центральное",
      electricity: "Центральное",
      gas: "Центральное",
    },
    extraElements: [],
    exteriorCovers: {
      foundationCovers: [],
      exteriorWallsCovers: [],
      roofCovers: [],
    },
    remodeling: {
      hasRemodeling: false,
      planByDocumentsPath: "Нет",
      description: "Нет",
      canBeComplianced: false,
      costOfComplianceWithPlan: 0,
    },
  };
}

describe("Objects Module API", () => {
  let testReport: any;
  let testReportId: string;

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    testReport = await createTestReport();
    testReportId = testReport.id;
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    delete process.env.BASE_DIR;
  });

  describe("Защита эндпоинтов", () => {
    it("должен вернуть 401 при получении объектов без авторизации", async () => {
      const res = await reportsRoutes.request(`/${testReportId}/objects`);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /:id/objects", () => {
    it("должен успешно добавить земельный участок", async () => {
      const landPlot = createTestLandPlot(
        "550e8400-e29b-41d4-a716-446655440100",
      );

      const res = await reportsRoutes.request(`/${testReportId}/objects`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(landPlot),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.id).toBe(landPlot.id);
      expect(data.objectType).toBe("immovable_property");
      expect(data.subtype).toBe("land_plot");
      expect(data.categoryLand).toBe("Земли населенных пунктов");
    });

    it("должен успешно добавить здание со ссылкой на участок", async () => {
      const landPlotId = "550e8400-e29b-41d4-a716-446655440101";
      const landPlot = createTestLandPlot(landPlotId);
      await reportsRoutes.request(`/${testReportId}/objects`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(landPlot),
      });

      const buildingId = "550e8400-e29b-41d4-a716-446655440102";
      const building = createTestBuilding(buildingId, landPlotId);

      const res = await reportsRoutes.request(`/${testReportId}/objects`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(building),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.locateLandPlotId).toBe(landPlotId);
    });

    it("должен отказать при добавлении здания с несуществующей ссылкой на участок", async () => {
      const building = createTestBuilding(
        "550e8400-e29b-41d4-a716-446655440103",
        "00000000-0000-0000-0000-000000000000",
      );

      const res = await reportsRoutes.request(`/${testReportId}/objects`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(building),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("не найден в отчёте");
    });

    it("должен отказать при добавлении объекта с дублирующимся ID", async () => {
      const landPlot = createTestLandPlot(
        "550e8400-e29b-41d4-a716-446655440104",
      );

      await reportsRoutes.request(`/${testReportId}/objects`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(landPlot),
      });

      const res = await reportsRoutes.request(`/${testReportId}/objects`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(landPlot),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("уже существует");
    });
  });

  describe("GET /:id/objects", () => {
    it("должен вернуть пустой массив, если объектов нет", async () => {
      const res = await reportsRoutes.request(`/${testReportId}/objects`, {
        headers: { Authorization: "Bearer test" },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(0);
    });

    it("должен вернуть список объектов", async () => {
      const landPlot = createTestLandPlot(
        "550e8400-e29b-41d4-a716-446655440105",
      );
      await reportsRoutes.request(`/${testReportId}/objects`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(landPlot),
      });

      const res = await reportsRoutes.request(`/${testReportId}/objects`, {
        headers: { Authorization: "Bearer test" },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(landPlot.id);
    });
  });

  describe("GET /:id/objects/:objectId", () => {
    it("должен вернуть конкретный объект", async () => {
      const landPlot = createTestLandPlot(
        "550e8400-e29b-41d4-a716-446655440106",
      );
      await reportsRoutes.request(`/${testReportId}/objects`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(landPlot),
      });

      const res = await reportsRoutes.request(
        `/${testReportId}/objects/${landPlot.id}`,
        { headers: { Authorization: "Bearer test" } },
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.id).toBe(landPlot.id);
    });

    it("должен вернуть 404 для несуществующего объекта", async () => {
      const res = await reportsRoutes.request(
        `/${testReportId}/objects/00000000-0000-0000-0000-000000000000`,
        { headers: { Authorization: "Bearer test" } },
      );

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /:id/objects/:objectId", () => {
    it("должен успешно обновить объект", async () => {
      const landPlot = createTestLandPlot(
        "550e8400-e29b-41d4-a716-446655440107",
      );
      await reportsRoutes.request(`/${testReportId}/objects`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(landPlot),
      });

      const res = await reportsRoutes.request(
        `/${testReportId}/objects/${landPlot.id}`,
        {
          method: "PUT",
          headers: AUTH_HEADERS,
          body: JSON.stringify({ totalArea: 800 }),
        },
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.totalArea).toBe(800);
    });

    it("должен вернуть 404 для несуществующего объекта", async () => {
      const res = await reportsRoutes.request(
        `/${testReportId}/objects/00000000-0000-0000-0000-000000000000`,
        {
          method: "PUT",
          headers: AUTH_HEADERS,
          body: JSON.stringify({ totalArea: 800 }),
        },
      );

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /:id/objects/:objectId", () => {
    it("должен успешно удалить объект", async () => {
      const landPlot = createTestLandPlot(
        "550e8400-e29b-41d4-a716-446655440108",
      );
      await reportsRoutes.request(`/${testReportId}/objects`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(landPlot),
      });

      const res = await reportsRoutes.request(
        `/${testReportId}/objects/${landPlot.id}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer test" },
        },
      );

      expect(res.status).toBe(200);

      const getRes = await reportsRoutes.request(
        `/${testReportId}/objects/${landPlot.id}`,
        { headers: { Authorization: "Bearer test" } },
      );
      expect(getRes.status).toBe(404);
    });

    it("должен отказать при удалении объекта, на который ссылаются", async () => {
      const landPlotId = "550e8400-e29b-41d4-a716-446655440109";
      const landPlot = createTestLandPlot(landPlotId);
      await reportsRoutes.request(`/${testReportId}/objects`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(landPlot),
      });

      const building = createTestBuilding(
        "550e8400-e29b-41d4-a716-446655440110",
        landPlotId,
      );
      await reportsRoutes.request(`/${testReportId}/objects`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(building),
      });

      const res = await reportsRoutes.request(
        `/${testReportId}/objects/${landPlotId}`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer test" },
        },
      );

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("ссылаются другие объекты");
    });

    it("должен вернуть 404 при удалении несуществующего объекта", async () => {
      const res = await reportsRoutes.request(
        `/${testReportId}/objects/00000000-0000-0000-0000-000000000000`,
        {
          method: "DELETE",
          headers: { Authorization: "Bearer test" },
        },
      );

      expect(res.status).toBe(404);
    });
  });
});
