import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { reportsRouter } from "../index";
import { ensureAppStructure } from "../../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-appraisers-test-${crypto.randomUUID()}`,
);

const AUTH_HEADERS = {
  Authorization: "Bearer test-valid-token",
  "Content-Type": "application/json",
};

async function createTestReport() {
  const payload = {
    reportSequenceNumber: "APR-001",
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

function createMockSnapshot(appraiserId: string) {
  const today = new Date();
  const currentYear = today.getFullYear();

  return {
    appraiserId,
    snapshotDate: today.toISOString().split("T")[0], // Сегодня
    isFrozen: false,
    data: {
      id: appraiserId,
      fullName: "Иванов Иван Иванович",
      contacts: {
        email: "ivanov@test.ru",
        phone: "+79991234567",
      },
      address: "г. Москва, ул. Тестовая, д. 1",
      taxIdentificationNumber: "123456789012",
      diploma: {
        nameOfType: "Бакалавриат",
        university: "МГУ",
        numberDiploma: "12345678",
        program: "Оценка недвижимости",
        issueDate: "2015-06-15",
      },
      qualificationCertificate: [
        {
          id: crypto.randomUUID(),
          issuedBy: "РСО",
          issuedDate: "2020-01-01",
          validDateFrom: `${currentYear - 5}-01-01`, //  5 лет назад
          validDateTo: `${currentYear + 5}-01-01`, //  5 лет вперёд
          numberQualificationCertificate: "А-12345",
        },
      ],
      workExperienceStartYear: "2015",
      insurance: [
        {
          id: crypto.randomUUID(),
          nameInsuranceCompany: "ООО 'Страхование'",
          contractNumber: "П-001",
          issueDate: `${currentYear}-01-01`,
          validDateFrom: `${currentYear}-01-01`,
          validDateTo: `${currentYear + 1}-12-31`, // Действует ещё год
          insuredAmount: "10000000",
        },
      ],
      selfRegulatoryInfo: {
        legalForm: "Ассоциация",
        fullName: "Ассоциация 'Российское общество оценщиков'",
        shortName: "Ассоциация РОО",
        regAddress: "г. Москва, ул. СРО, д. 1",
        physicalAddress: "г. Москва, ул. СРО, д. 1",
        appraiserRegNumber: "СРО-12345",
        appraiserRegDate: "2020-02-01",
        appraiserDocumentOfMembershipName: "Членская книжка",
        appraiserDocumentOfMembershipDate: "2020-02-01",
      },
      hasPrivatePractice: false,
    },
  };
}

describe("Appraisers Module API", () => {
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
    it("должен вернуть 401 при отсутствии авторизации", async () => {
      const routes = [
        { method: "GET", path: `/${testReportId}/appraisers` },
        { method: "POST", path: `/${testReportId}/appraisers`, body: {} },
        {
          method: "DELETE",
          path: `/${testReportId}/appraisers/550e8400-e29b-41d4-a716-446655440100`,
        },
      ];

      for (const route of routes) {
        const res = await reportsRouter.request(route.path, {
          method: route.method as any,
          body: route.body ? JSON.stringify(route.body) : undefined,
        });
        expect(res.status).toBe(401);
      }
    });
  });

  describe("GET /:id/appraisers", () => {
    it("должен вернуть пустой массив, если оценщиков нет", async () => {
      const res = await reportsRouter.request(`/${testReportId}/appraisers`, {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toEqual([]);
    });

    it("должен вернуть список привязанных оценщиков", async () => {
      const snapshot = createMockSnapshot(
        "550e8400-e29b-41d4-a716-446655440100",
      );

      const postRes = await reportsRouter.request(
        `/${testReportId}/appraisers`,
        {
          method: "POST",
          headers: AUTH_HEADERS,
          body: JSON.stringify(snapshot),
        },
      );
      expect(postRes.status).toBe(201);

      const res = await reportsRouter.request(`/${testReportId}/appraisers`, {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].appraiserId).toBe("550e8400-e29b-41d4-a716-446655440100");
      expect(data[0].data.fullName).toBe("Иванов Иван Иванович");
    });
  });

  describe("POST /:id/appraisers", () => {
    it("должен успешно привязать оценщика к отчёту", async () => {
      const snapshot = createMockSnapshot(
        "550e8400-e29b-41d4-a716-446655440101",
      );
      const todayStr = new Date().toISOString().split("T")[0];

      const res = await reportsRouter.request(`/${testReportId}/appraisers`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(snapshot),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.appraiserId).toBe("550e8400-e29b-41d4-a716-446655440101");
      expect(data.snapshotDate).toBe(todayStr);
      expect(data.isFrozen).toBe(false);
    });

    it("должен отказать при дублировании appraiserId", async () => {
      const snapshot = createMockSnapshot(
        "550e8400-e29b-41d4-a716-446655440102",
      );

      await reportsRouter.request(`/${testReportId}/appraisers`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(snapshot),
      });

      const res = await reportsRouter.request(`/${testReportId}/appraisers`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(snapshot),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("уже привязан");
    });

    it("должен отказать, если у оценщика нет полиса страхования", async () => {
      const snapshot = createMockSnapshot(
        "550e8400-e29b-41d4-a716-446655440103",
      );
      (snapshot.data as any).insurance = [];

      const res = await reportsRouter.request(`/${testReportId}/appraisers`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(snapshot),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("полиса страхования");
    });

    it("должен отказать, если у оценщика нет квалификационного аттестата", async () => {
      const snapshot = createMockSnapshot(
        "550e8400-e29b-41d4-a716-446655440104",
      );
      (snapshot.data as any).qualificationCertificate = [];

      const res = await reportsRouter.request(`/${testReportId}/appraisers`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(snapshot),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("аттестата");
    });

    it("должен отказать, если нет действующего полиса на дату отчёта", async () => {
      const snapshot = createMockSnapshot(
        "550e8400-e29b-41d4-a716-446655440103",
      );
      const lastYear = new Date().getFullYear() - 1;
      (snapshot.data.insurance as any)[0].validDateTo = `${lastYear}-12-31`; // Истёк в прошлом году

      const res = await reportsRouter.request(`/${testReportId}/appraisers`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(snapshot),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Нет действующего полиса страхования");
    });

    it("должен отказать, если нет действующего аттестата на дату отчёта", async () => {
      const snapshot = createMockSnapshot(
        "550e8400-e29b-41d4-a716-446655440104",
      );
      const lastYear = new Date().getFullYear() - 1;
      (snapshot.data.qualificationCertificate as any)[0].validDateTo =
        `${lastYear}-12-31`;

      const res = await reportsRouter.request(`/${testReportId}/appraisers`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(snapshot),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain(
        "Нет действующего квалификационного аттестата",
      );
    });

    it("должен отказать при невалидных данных (отсутствует appraiserId)", async () => {
      const snapshot = createMockSnapshot(
        "550e8400-e29b-41d4-a716-446655440105",
      );
      delete (snapshot as any).appraiserId;

      const res = await reportsRouter.request(`/${testReportId}/appraisers`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(snapshot),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Невалидные данные");
    });
  });

  describe("DELETE /:id/appraisers/:appraiserId", () => {
    it("должен успешно отвязать оценщика от отчёта", async () => {
      const snapshot = createMockSnapshot(
        "550e8400-e29b-41d4-a716-446655440106",
      );
      await reportsRouter.request(`/${testReportId}/appraisers`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(snapshot),
      });

      const deleteRes = await reportsRouter.request(
        `/${testReportId}/appraisers/550e8400-e29b-41d4-a716-446655440106`,
        { method: "DELETE", headers: { Authorization: "Bearer test" } },
      );
      expect(deleteRes.status).toBe(200);

      const getRes = await reportsRouter.request(
        `/${testReportId}/appraisers`,
        {
          headers: { Authorization: "Bearer test" },
        },
      );
      const data = (await getRes.json()) as any[];
      expect(data).toHaveLength(0);
    });

    it("должен вернуть 404 при отвязке несуществующего оценщика", async () => {
      const res = await reportsRouter.request(
        `/${testReportId}/appraisers/00000000-0000-0000-0000-000000000000`,
        { method: "DELETE", headers: { Authorization: "Bearer test" } },
      );
      expect(res.status).toBe(404);
    });

    it("должен вернуть 404 для несуществующего отчёта", async () => {
      const res = await reportsRouter.request(
        `/00000000-0000-0000-0000-000000000000/appraisers/550e8400-e29b-41d4-a716-446655440107`,
        { method: "DELETE", headers: { Authorization: "Bearer test" } },
      );
      expect(res.status).toBe(404);
    });
  });
});
