import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { workplacesRouter } from "./routes";
import { profileRouter } from "../profile/routes";
import { authRouter } from "../auth/routes";
import { ensureAppStructure } from "../../../services/storage";
import { sessionStore } from "../session";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-workplaces-test-${crypto.randomUUID()}`,
);

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function createValidWorkplace(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    legalForm: "ООО",
    fullName: "ООО 'Оценочная компания Ромашка'",
    shortName: "ООО 'Ромашка'",
    regNumber: "1234567890123", // 13 цифр
    regDate: "2010-01-01",
    taxIdentificationNumber: "1234567890", // 10 цифр
    regReasonCodeTax: "123456789", // 9 цифр
    regAddress: "г. Москва, ул. Юридическая, д. 1",
    physicalAddress: "г. Москва, ул. Фактическая, д. 1",
    contacts: {
      email: "company@romashka.ru",
      phone: "+79991112233",
    },
    insurance: [
      {
        id: crypto.randomUUID(),
        nameInsuranceCompany: "ООО 'Страхование'",
        contractNumber: "П-001",
        issueDate: "2025-01-01",
        validDateFrom: "2025-01-01",
        validDateTo: "2026-12-31",
        insuredAmount: "10000000",
      },
    ],
    appraiserId: crypto.randomUUID(),
    providerDocumentList: [
      {
        id: crypto.randomUUID(),
        name: "Устав.pdf",
        path: "/docs/charter.pdf",
        mimeType: "application/pdf",
      },
    ],
    ...overrides,
  };
}

describe("Workplaces Module API", () => {
  let token: string;
  let testEmail: string;
  let testUserId: string;

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    sessionStore.clear();

    testEmail = `wp-user-${crypto.randomUUID().slice(0, 8)}@test.ru`;
    testUserId = crypto.randomUUID();

    const registerPayload = {
      appraiser: {
        id: testUserId,
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
    it("должен вернуть 401 при отсутствии авторизации на POST", async () => {
      const res = await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(createValidWorkplace()),
      });
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на DELETE", async () => {
      const res = await workplacesRouter.request(
        `/me/workplaces/${crypto.randomUUID()}`,
        { method: "DELETE" },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("POST /me/workplaces", () => {
    it("должен успешно добавить рабочее место", async () => {
      const workplace = createValidWorkplace();

      const res = await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(workplace),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;

      expect(data.workPlaceList).toHaveLength(1);
      expect(data.workPlaceList[0].id).toBe(workplace.id);
      expect(data.workPlaceList[0].fullName).toBe(workplace.fullName);
      expect(data.workPlaceList[0].regNumber).toBe(workplace.regNumber);
      expect(data.workPlaceList[0].insurance).toHaveLength(1);
    });

    it("НЕ должен возвращать passwordHash в ответе", async () => {
      const res = await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(createValidWorkplace()),
      });

      const data = (await res.json()) as any;
      expect(data.passwordHash).toBeUndefined();
    });

    it("должен успешно добавить несколько рабочих мест", async () => {
      const wp1 = createValidWorkplace({ fullName: "ООО 'Ромашка'" });
      const wp2 = createValidWorkplace({ fullName: "ООО 'Василёк'" });

      await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(wp1),
      });

      const res2 = await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(wp2),
      });

      expect(res2.status).toBe(201);
      const data = (await res2.json()) as any;
      expect(data.workPlaceList).toHaveLength(2);
    });

    it("должен отказать при дублировании ID рабочего места", async () => {
      const workplace = createValidWorkplace();

      const res1 = await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(workplace),
      });
      expect(res1.status).toBe(201);

      const res2 = await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(workplace),
      });

      expect(res2.status).toBe(400);
      const data = (await res2.json()) as any;
      expect(data.error).toContain("уже существует");
    });

    it("должен отказать при отсутствии полиса страхования компании", async () => {
      const workplace = createValidWorkplace({ insurance: [] });

      const res = await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(workplace),
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при отсутствии документов компании", async () => {
      const workplace = createValidWorkplace({ providerDocumentList: [] });

      const res = await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(workplace),
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при невалидном ОГРН (не 13 цифр)", async () => {
      const workplace = createValidWorkplace({ regNumber: "12345" });

      const res = await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(workplace),
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при невалидном ИНН компании (не 10 цифр)", async () => {
      const workplace = createValidWorkplace({
        taxIdentificationNumber: "123",
      });

      const res = await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(workplace),
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при невалидном КПП (не 9 цифр)", async () => {
      const workplace = createValidWorkplace({ regReasonCodeTax: "12" });

      const res = await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(workplace),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /me/workplaces/:id", () => {
    it("должен успешно удалить рабочее место по id", async () => {
      const workplace = createValidWorkplace();

      // Сначала добавляем
      await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(workplace),
      });

      const deleteRes = await workplacesRouter.request(
        `/me/workplaces/${workplace.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(deleteRes.status).toBe(200);
      const data = (await deleteRes.json()) as any;
      expect(data.workPlaceList).toHaveLength(0);
    });

    it("должен удалить только указанное рабочее место, оставляя остальные", async () => {
      const wp1 = createValidWorkplace({ id: crypto.randomUUID() });
      const wp2 = createValidWorkplace({ id: crypto.randomUUID() });

      await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(wp1),
      });
      await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(wp2),
      });

      const deleteRes = await workplacesRouter.request(
        `/me/workplaces/${wp1.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(deleteRes.status).toBe(200);
      const data = (await deleteRes.json()) as any;
      expect(data.workPlaceList).toHaveLength(1);
      expect(data.workPlaceList[0].id).toBe(wp2.id);
    });

    it("должен сбросить defaultWorkplaceId, если удаляется текущее место работы по умолчанию", async () => {
      const workplace = createValidWorkplace();

      await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(workplace),
      });

      await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({ defaultWorkplaceId: workplace.id }),
      });

      const profileRes = await profileRouter.request("/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileData = (await profileRes.json()) as any;
      expect(profileData.defaultWorkplaceId).toBe(workplace.id);

      const deleteRes = await workplacesRouter.request(
        `/me/workplaces/${workplace.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(deleteRes.status).toBe(200);

      const data = (await deleteRes.json()) as any;
      expect(data.defaultWorkplaceId).toBeUndefined();
    });

    it("должен сохранить defaultWorkplaceId, если удаляется другое рабочее место", async () => {
      const wp1 = createValidWorkplace({ id: crypto.randomUUID() });
      const wp2 = createValidWorkplace({ id: crypto.randomUUID() });

      await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(wp1),
      });
      await workplacesRouter.request("/me/workplaces", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(wp2),
      });

      await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({ defaultWorkplaceId: wp1.id }),
      });

      const deleteRes = await workplacesRouter.request(
        `/me/workplaces/${wp2.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(deleteRes.status).toBe(200);
      const data = (await deleteRes.json()) as any;
      expect(data.defaultWorkplaceId).toBe(wp1.id);
    });

    it("должен вернуть 200 с тем же пользователем, если рабочее место не найдено", async () => {
      const fakeId = crypto.randomUUID();
      const res = await workplacesRouter.request(`/me/workplaces/${fakeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.contacts.email).toBe(testEmail);
    });
  });
});
