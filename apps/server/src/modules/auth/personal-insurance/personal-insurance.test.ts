import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { personalInsuranceRouter } from "./routes";
import { authRouter } from "../auth/routes";
import { ensureAppStructure } from "../../../services/storage";
import { sessionStore } from "../session";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-personal-insurance-test-${crypto.randomUUID()}`,
);

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function createValidInsurance(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    nameInsuranceCompany: "ООО 'Страхование Жизни'",
    contractNumber: "П-12345-А",
    issueDate: "2024-01-01",
    validDateFrom: "2024-01-01",
    validDateTo: "2025-01-01",
    insuredAmount: "10000000",
    ...overrides,
  };
}

describe("Personal Insurance Module API", () => {
  let token: string;
  let testEmail: string;

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    sessionStore.clear();

    testEmail = `ins-user-${crypto.randomUUID().slice(0, 8)}@test.ru`;
    const registerPayload = {
      appraiser: {
        id: crypto.randomUUID(),
        fullName: "Тестов Пользователь",
        contacts: { email: testEmail, phone: "+79991234567" },
        hasPrivatePractice: false,
      },
      password: "StrongPassword123!",
      recoveryWords: [
        "apple",
        "banana",
        "cherry",
        "date",
        "elderberry",
        "fig",
        "grape",
        "honeydew",
        "kiwi",
        "lemon",
        "mango",
        "nectarine",
      ],
    };

    await authRouter.request("/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(registerPayload),
    });

    const loginRes = await authRouter.request("/login", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({
        email: testEmail,
        password: "StrongPassword123!",
      }),
    });
    const loginData = (await loginRes.json()) as any;
    token = loginData.token;
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    delete process.env.BASE_DIR;
    sessionStore.clear();
  });

  describe("Защита эндпоинтов", () => {
    it("должен вернуть 401 при отсутствии авторизации на GET", async () => {
      const res = await personalInsuranceRouter.request(
        "/me/personal-insurance",
      );
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на POST", async () => {
      const res = await personalInsuranceRouter.request(
        "/me/personal-insurance",
        {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(createValidInsurance()),
        },
      );
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на DELETE", async () => {
      const res = await personalInsuranceRouter.request(
        `/me/personal-insurance/${crypto.randomUUID()}`,
        { method: "DELETE" },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /me/personal-insurance", () => {
    it("должен вернуть пустой массив, если полисов нет", async () => {
      const res = await personalInsuranceRouter.request(
        "/me/personal-insurance",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toEqual([]);
    });

    it("должен вернуть список добавленных полисов", async () => {
      const insurance = createValidInsurance();

      await personalInsuranceRouter.request("/me/personal-insurance", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(insurance),
      });

      const res = await personalInsuranceRouter.request(
        "/me/personal-insurance",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe(insurance.id);
      expect(data[0].nameInsuranceCompany).toBe(insurance.nameInsuranceCompany);
    });
  });

  describe("POST /me/personal-insurance", () => {
    it("должен успешно добавить полис страхования", async () => {
      const insurance = createValidInsurance();

      const res = await personalInsuranceRouter.request(
        "/me/personal-insurance",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
          body: JSON.stringify(insurance),
        },
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;

      expect(data.insurance).toHaveLength(1);
      expect(data.insurance[0].id).toBe(insurance.id);
      expect(data.insurance[0].contractNumber).toBe(insurance.contractNumber);
    });

    it("НЕ должен возвращать passwordHash в ответе", async () => {
      const res = await personalInsuranceRouter.request(
        "/me/personal-insurance",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
          body: JSON.stringify(createValidInsurance()),
        },
      );

      const data = (await res.json()) as any;
      expect(data.passwordHash).toBeUndefined();
    });

    it("должен успешно добавить несколько полисов", async () => {
      const ins1 = createValidInsurance({ contractNumber: "П-001" });
      const ins2 = createValidInsurance({ contractNumber: "П-002" });

      await personalInsuranceRouter.request("/me/personal-insurance", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(ins1),
      });

      const res2 = await personalInsuranceRouter.request(
        "/me/personal-insurance",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
          body: JSON.stringify(ins2),
        },
      );

      expect(res2.status).toBe(201);
      const data = (await res2.json()) as any;
      expect(data.insurance).toHaveLength(2);
    });

    it("должен отказать при дублировании ID полиса", async () => {
      const insurance = createValidInsurance();

      const res1 = await personalInsuranceRouter.request(
        "/me/personal-insurance",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
          body: JSON.stringify(insurance),
        },
      );
      expect(res1.status).toBe(201);

      const res2 = await personalInsuranceRouter.request(
        "/me/personal-insurance",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
          body: JSON.stringify(insurance),
        },
      );

      expect(res2.status).toBe(400);
      const data = (await res2.json()) as any;
      expect(data.error).toContain("уже существует");
    });

    it("должен отказать при невалидных данных (отсутствует id)", async () => {
      const insurance = createValidInsurance();
      delete (insurance as any).id;

      const res = await personalInsuranceRouter.request(
        "/me/personal-insurance",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
          body: JSON.stringify(insurance),
        },
      );

      expect(res.status).toBe(400);
    });

    it("должен отказать при невалидных данных (пустое nameInsuranceCompany)", async () => {
      const insurance = createValidInsurance({ nameInsuranceCompany: "" });

      const res = await personalInsuranceRouter.request(
        "/me/personal-insurance",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
          body: JSON.stringify(insurance),
        },
      );

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /me/personal-insurance/:id", () => {
    it("должен успешно удалить полис по id", async () => {
      const insurance = createValidInsurance();

      await personalInsuranceRouter.request("/me/personal-insurance", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(insurance),
      });

      const deleteRes = await personalInsuranceRouter.request(
        `/me/personal-insurance/${insurance.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(deleteRes.status).toBe(200);
      const data = (await deleteRes.json()) as any;
      expect(data.insurance).toHaveLength(0);
    });

    it("должен удалить только указанный полис, оставляя остальные", async () => {
      const ins1 = createValidInsurance({
        id: crypto.randomUUID(),
        contractNumber: "П-001",
      });
      const ins2 = createValidInsurance({
        id: crypto.randomUUID(),
        contractNumber: "П-002",
      });

      await personalInsuranceRouter.request("/me/personal-insurance", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(ins1),
      });
      await personalInsuranceRouter.request("/me/personal-insurance", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(ins2),
      });

      const deleteRes = await personalInsuranceRouter.request(
        `/me/personal-insurance/${ins1.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(deleteRes.status).toBe(200);
      const data = (await deleteRes.json()) as any;
      expect(data.insurance).toHaveLength(1);
      expect(data.insurance[0].id).toBe(ins2.id);
    });

    it("должен вернуть 200 с тем же пользователем, если полис не найден", async () => {
      const fakeId = crypto.randomUUID();
      const res = await personalInsuranceRouter.request(
        `/me/personal-insurance/${fakeId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.contacts.email).toBe(testEmail);
      expect(data.insurance).toEqual([]);
    });
  });
});
