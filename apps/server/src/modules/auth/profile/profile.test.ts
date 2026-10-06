import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { profileRouter } from "./routes";
import { authRouter } from "../auth/routes";
import { ensureAppStructure } from "../../../services/storage";
import { sessionStore } from "../session";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-profile-test-${crypto.randomUUID()}`,
);

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

describe("Profile Module API", () => {
  let token: string;
  let testEmail: string;
  let testUserId: string;

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    sessionStore.clear();

    testEmail = `profile-user-${crypto.randomUUID().slice(0, 8)}@test.ru`;
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
    it("должен вернуть 401 при отсутствии авторизации на GET /me", async () => {
      const res = await profileRouter.request("/me");
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на PATCH /me/profile", async () => {
      const res = await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ fullName: "Новое Имя" }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("GET /me", () => {
    it("должен успешно вернуть профиль пользователя", async () => {
      const res = await profileRouter.request("/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;

      expect(data.id).toBe(testUserId);
      expect(data.fullName).toBe("Тестов Пользователь");
      expect(data.contacts.email).toBe(testEmail);
      expect(data.contacts.phone).toBe("+79991234567");
    });

    it("НЕ должен возвращать passwordHash в ответе", async () => {
      const res = await profileRouter.request("/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = (await res.json()) as any;
      expect(data.passwordHash).toBeUndefined();
    });

    it("НЕ должен возвращать recoveryWordsHashes в ответе", async () => {
      const res = await profileRouter.request("/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = (await res.json()) as any;
      expect(data.recoveryWordsHashes).toBeUndefined();
    });

    it("должен вернуть 404, если пользователь не найден (токен невалидный)", async () => {
      const fakeEmail = "nonexistent@test.ru";
      const fakeToken = crypto.randomUUID();
      sessionStore.set(fakeToken, fakeEmail);

      const res = await profileRouter.request("/me", {
        headers: { Authorization: `Bearer ${fakeToken}` },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("PATCH /me/profile", () => {
    it("должен успешно обновить fullName", async () => {
      const res = await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({ fullName: "Иванов Иван Иванович" }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.fullName).toBe("Иванов Иван Иванович");
    });

    it("должен успешно обновить контактные данные", async () => {
      const res = await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          contacts: {
            email: testEmail, // email не должен меняться через этот эндпоинт
            phone: "+79997654321",
            telegram: "@testuser",
          },
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.contacts.phone).toBe("+79997654321");
      expect(data.contacts.telegram).toBe("@testuser");
    });

    it("должен успешно обновить адрес", async () => {
      const res = await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          address: "г. Москва, ул. Тестовая, д. 1, кв. 1",
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.address).toBe("г. Москва, ул. Тестовая, д. 1, кв. 1");
    });

    it("НЕ должен возвращать passwordHash после обновления", async () => {
      const res = await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({ fullName: "Новое Имя" }),
      });

      const data = (await res.json()) as any;
      expect(data.passwordHash).toBeUndefined();
    });

    it("должен сохранить неизменными поля, которые не передавались", async () => {
      await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({ fullName: "Первое Обновление" }),
      });

      const res = await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({ address: "Новый адрес" }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;

      expect(data.fullName).toBe("Первое Обновление");
      expect(data.address).toBe("Новый адрес");
    });

    it("должен отказать при невалидных данных (слишком короткое fullName)", async () => {
      const res = await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({ fullName: "А" }), // Менее 5 символов
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при невалидном email", async () => {
      const res = await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          contacts: {
            email: "not-an-email",
            phone: "+79991234567",
          },
        }),
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при слишком коротком номере телефона", async () => {
      const res = await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          contacts: {
            email: testEmail,
            phone: "123", // Менее 10 символов
          },
        }),
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при попытке обновить ИНН с невалидным форматом", async () => {
      const res = await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          taxIdentificationNumber: "12345", // Должно быть 12 цифр
        }),
      });

      expect(res.status).toBe(400);
    });

    it("должен успешно обновить ИНН с валидным форматом", async () => {
      const res = await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          taxIdentificationNumber: "123456789012", // 12 цифр
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.taxIdentificationNumber).toBe("123456789012");
    });

    it("должен отказать при невалидном годе начала стажа", async () => {
      const res = await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          workExperienceStartYear: "20", // Должно быть 4 цифры
        }),
      });

      expect(res.status).toBe(400);
    });

    it("должен успешно обновить год начала стажа", async () => {
      const res = await profileRouter.request("/me/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify({
          workExperienceStartYear: "2015",
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.workExperienceStartYear).toBe("2015");
    });
  });
});
