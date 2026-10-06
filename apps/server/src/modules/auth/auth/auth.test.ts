import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { authRouter } from "./routes";
import { ensureAppStructure } from "../../../services/storage";
import { sessionStore } from "../session";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-auth-test-${crypto.randomUUID()}`,
);

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function createValidRegistrationPayload(overrides = {}) {
  return {
    appraiser: {
      id: crypto.randomUUID(),
      fullName: "Иванов Иван Иванович",
      contacts: {
        email: `test-${crypto.randomUUID().slice(0, 8)}@test.ru`,
        phone: "+79991234567",
      },
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
    ...overrides,
  };
}

describe("Auth Module API", () => {
  let testEmail: string;
  const testPassword = "StrongPassword123!";
  const testRecoveryWords = [
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
  ];

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    sessionStore.clear();

    testEmail = `user-${crypto.randomUUID().slice(0, 8)}@test.ru`;
    const payload = createValidRegistrationPayload({
      appraiser: {
        id: crypto.randomUUID(),
        fullName: "Тестов Пользователь",
        contacts: { email: testEmail, phone: "+79991234567" },
        hasPrivatePractice: false,
      },
      password: testPassword,
      recoveryWords: testRecoveryWords,
    });

    const res = await authRouter.request("/register", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(201);
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    delete process.env.BASE_DIR;
    sessionStore.clear();
  });

  describe("POST /register", () => {
    it("должен успешно зарегистрировать нового пользователя", async () => {
      const payload = createValidRegistrationPayload();

      const res = await authRouter.request("/register", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;

      expect(data.fullName).toBe(payload.appraiser.fullName);
      expect(data.contacts.email).toBe(payload.appraiser.contacts.email);
    });

    it("НЕ должен возвращать passwordHash в ответе", async () => {
      const payload = createValidRegistrationPayload();

      const res = await authRouter.request("/register", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as any;
      expect(data.passwordHash).toBeUndefined();
    });

    it("НЕ должен возвращать recoveryWordsHashes в ответе", async () => {
      const payload = createValidRegistrationPayload();

      const res = await authRouter.request("/register", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as any;
      expect(data.recoveryWordsHashes).toBeUndefined();
    });

    it("должен отказать при регистрации с существующим email", async () => {
      const payload = createValidRegistrationPayload({
        appraiser: {
          id: crypto.randomUUID(),
          fullName: "Другой Пользователь",
          contacts: { email: testEmail, phone: "+79997654321" }, // Тот же email
          hasPrivatePractice: false,
        },
      });

      const res = await authRouter.request("/register", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("уже существует");
    });

    it("должен отказать при невалидных данных (короткий пароль)", async () => {
      const payload = createValidRegistrationPayload({
        password: "123", // Слишком короткий
      });

      const res = await authRouter.request("/register", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при невалидных данных (не 12 слов восстановления)", async () => {
      const payload = createValidRegistrationPayload({
        recoveryWords: ["apple", "banana"], // Только 2 слова
      });

      const res = await authRouter.request("/register", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /login", () => {
    it("должен успешно войти с корректными данными", async () => {
      const res = await authRouter.request("/login", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;

      expect(data.token).toBeDefined();
      expect(typeof data.token).toBe("string");
      expect(data.user).toBeDefined();
      expect(data.user.contacts.email).toBe(testEmail);
    });

    it("НЕ должен возвращать passwordHash после входа", async () => {
      const res = await authRouter.request("/login", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      const data = (await res.json()) as any;
      expect(data.user.passwordHash).toBeUndefined();
    });

    it("должен отказать при неверном пароле", async () => {
      const res = await authRouter.request("/login", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          email: testEmail,
          password: "WrongPassword123!",
        }),
      });

      expect(res.status).toBe(401);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Неверный");
    });

    it("должен отказать при неверном email", async () => {
      const res = await authRouter.request("/login", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          email: "nonexistent@test.ru",
          password: testPassword,
        }),
      });

      expect(res.status).toBe(401);
    });

    it("должен отказать при невалидном формате email", async () => {
      const res = await authRouter.request("/login", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          email: "not-an-email",
          password: testPassword,
        }),
      });

      expect(res.status).toBe(400);
    });

    it("должен создать уникальные токены при повторных входах", async () => {
      const res1 = await authRouter.request("/login", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });
      const res2 = await authRouter.request("/login", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });

      const data1 = (await res1.json()) as any;
      const data2 = (await res2.json()) as any;

      expect(data1.token).not.toBe(data2.token);
    });
  });

  describe("POST /logout", () => {
    it("должен успешно выйти и инвалидировать токен", async () => {
      const loginRes = await authRouter.request("/login", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });
      const { token } = (await loginRes.json()) as any;

      const logoutRes = await authRouter.request("/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(logoutRes.status).toBe(200);
      const logoutData = (await logoutRes.json()) as any;
      expect(logoutData.message).toContain("Выход выполнен");

      const { profileRouter } = await import("../profile/routes");
      const meRes = await profileRouter.request("/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(meRes.status).toBe(401);
    });

    it("должен вернуть успех даже при отсутствии токена", async () => {
      const res = await authRouter.request("/logout", {
        method: "POST",
      });

      expect(res.status).toBe(200);
    });
  });

  describe("POST /reset-password", () => {
    it("должен успешно сбросить пароль при 6+ верных словах", async () => {
      const res = await authRouter.request("/reset-password", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          email: testEmail,
          recoveryWords: testRecoveryWords, // Все 12 слов
          newPassword: "NewStrongPassword456!",
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.message).toContain("изменён");

      const loginOldRes = await authRouter.request("/login", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });
      expect(loginOldRes.status).toBe(401);

      const loginNewRes = await authRouter.request("/login", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          email: testEmail,
          password: "NewStrongPassword456!",
        }),
      });
      expect(loginNewRes.status).toBe(200);
    });

    it("должен отказать, если указано менее 6 верных слов", async () => {
      const res = await authRouter.request("/reset-password", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          email: testEmail,
          recoveryWords: [
            "apple",
            "banana",
            "cherry",
            "date",
            "elderberry",
            "wrongword", // 5 верных + 1 неверное = недостаточно
          ],
          newPassword: "NewStrongPassword456!",
        }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Неверные данные");
    });

    it("должен отказать, если из 12 присланных слов только 5 верных", async () => {
      const res = await authRouter.request("/reset-password", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          email: testEmail,
          recoveryWords: [
            "apple",
            "banana",
            "cherry",
            "date",
            "elderberry", // 5 верных
            "wrong1",
            "wrong2",
            "wrong3",
            "wrong4",
            "wrong5",
            "wrong6",
            "wrong7", // 7 неверных
          ],
          newPassword: "NewStrongPassword456!",
        }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Неверные данные");
    });

    it("должен отказать при неверном email", async () => {
      const res = await authRouter.request("/reset-password", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          email: "nonexistent@test.ru",
          recoveryWords: testRecoveryWords,
          newPassword: "NewStrongPassword456!",
        }),
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при невалидном формате данных", async () => {
      const res = await authRouter.request("/reset-password", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          email: "not-an-email",
          recoveryWords: testRecoveryWords,
          newPassword: "NewStrongPassword456!",
        }),
      });

      expect(res.status).toBe(400);
    });

    it("должен работать с 6 точно верными словами (граничный случай)", async () => {
      const res = await authRouter.request("/reset-password", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          email: testEmail,
          recoveryWords: [
            "apple",
            "banana",
            "cherry",
            "date",
            "elderberry",
            "fig",
          ], // Ровно 6 верных
          newPassword: "NewStrongPassword456!",
        }),
      });

      expect(res.status).toBe(200);
    });
  });
});
