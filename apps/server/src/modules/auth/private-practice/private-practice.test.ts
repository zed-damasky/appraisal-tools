import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { privatePracticeRouter } from "./routes";
import { authRouter } from "../auth/routes";
import { ensureAppStructure } from "../../../services/storage";
import { sessionStore } from "../session";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-private-practice-test-${crypto.randomUUID()}`,
);

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function createValidPrivatePracticeInfo(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    legalForm: "ИП",
    regDate: "2020-01-15",
    documentName: "Свидетельство о регистрации ИП",
    documentDate: "2020-01-15",
    documentNumber: "ОГРНИП 1234567890123",
    privatePracticeDocumentList: [],
    ...overrides,
  };
}

describe("Private Practice Module API", () => {
  let token: string;
  let testEmail: string;

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    sessionStore.clear();

    testEmail = `pp-user-${crypto.randomUUID().slice(0, 8)}@test.ru`;
    const registerPayload = {
      appraiser: {
        id: crypto.randomUUID(),
        fullName: "Тестов Пользователь",
        contacts: { email: testEmail, phone: "+79991234567" },
        hasPrivatePractice: false,
      },
      password: "StrongPassword123!",
      recoveryWords: [
        "apple", "banana", "cherry", "date", "elderberry", "fig",
        "grape", "honeydew", "kiwi", "lemon", "mango", "nectarine",
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
      body: JSON.stringify({ email: testEmail, password: "StrongPassword123!" }),
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
    it("должен вернуть 401 при отсутствии авторизации", async () => {
      const res = await privatePracticeRouter.request("/me/private-practice", {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ hasPrivatePractice: true }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("PATCH /me/private-practice", () => {
    it("должен успешно включить статус частной практики", async () => {
      const privatePracticeInfo = createValidPrivatePracticeInfo();

      const res = await privatePracticeRouter.request("/me/private-practice", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          hasPrivatePractice: true,
          privatePracticeInformation: privatePracticeInfo,
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;

      expect(data.hasPrivatePractice).toBe(true);
      expect(data.privatePracticeInformation).toBeDefined();
      expect(data.privatePracticeInformation.id).toBe(privatePracticeInfo.id);
      expect(data.privatePracticeInformation.legalForm).toBe("ИП");
      expect(data.privatePracticeInformation.documentNumber).toBe(
        privatePracticeInfo.documentNumber,
      );
    });

    it("должен успешно выключить статус частной практики и обнулить данные", async () => {
      const privatePracticeInfo = createValidPrivatePracticeInfo();
      await privatePracticeRouter.request("/me/private-practice", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          hasPrivatePractice: true,
          privatePracticeInformation: privatePracticeInfo,
        }),
      });

      const res = await privatePracticeRouter.request("/me/private-practice", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          hasPrivatePractice: false,
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;

      expect(data.hasPrivatePractice).toBe(false);
      expect(data.privatePracticeInformation).toBeUndefined();
    });

    it("НЕ должен возвращать passwordHash в ответе", async () => {
      const res = await privatePracticeRouter.request("/me/private-practice", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({ hasPrivatePractice: true }),
      });

      const data = (await res.json()) as any;
      expect(data.passwordHash).toBeUndefined();
    });

    it("должен отказать при невалидных данных (отсутствует hasPrivatePractice)", async () => {
      const res = await privatePracticeRouter.request("/me/private-practice", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({}), // Нет обязательного поля
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при невалидном типе hasPrivatePractice (не boolean)", async () => {
      const res = await privatePracticeRouter.request("/me/private-practice", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({ hasPrivatePractice: "yes" }), // Строка вместо boolean
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при невалидных данных privatePracticeInformation", async () => {
      const res = await privatePracticeRouter.request("/me/private-practice", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          hasPrivatePractice: true,
          privatePracticeInformation: {
            legalForm: "ИП",
          },
        }),
      });

      expect(res.status).toBe(400);
    });

    it("должен позволить обновить данные частной практики", async () => {
      const info1 = createValidPrivatePracticeInfo({
        documentNumber: "ОГРНИП 1111111111111",
      });
      await privatePracticeRouter.request("/me/private-practice", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          hasPrivatePractice: true,
          privatePracticeInformation: info1,
        }),
      });

      const info2 = createValidPrivatePracticeInfo({
        documentNumber: "ОГРНИП 2222222222222",
      });
      const res = await privatePracticeRouter.request("/me/private-practice", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          hasPrivatePractice: true,
          privatePracticeInformation: info2,
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.privatePracticeInformation.documentNumber).toBe(
        "ОГРНИП 2222222222222",
      );
    });

    it("должен разрешить включение ЧПО без privatePracticeInformation", async () => {
      const res = await privatePracticeRouter.request("/me/private-practice", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          hasPrivatePractice: true,
          // Не передаём privatePracticeInformation
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.hasPrivatePractice).toBe(true);
      expect(data.privatePracticeInformation).toBeUndefined();
    });
  });
});