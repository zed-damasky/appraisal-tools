import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { certificatesRouter } from "./routes";
import { authRouter } from "../auth/routes";
import { ensureAppStructure } from "../../../services/storage";
import { sessionStore } from "../session";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-certificates-test-${crypto.randomUUID()}`,
);

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

function createValidCertificate(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    issuedBy: "РСО 'Российское общество оценщиков'",
    issuedDate: "2020-01-15",
    validDateFrom: "2020-01-15",
    validDateTo: "2030-01-15",
    numberQualificationCertificate: "А-12345",
    ...overrides,
  };
}

describe("Certificates Module API", () => {
  let token: string;
  let testEmail: string;

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    sessionStore.clear();

    testEmail = `cert-user-${crypto.randomUUID().slice(0, 8)}@test.ru`;
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
    it("должен вернуть 401 при отсутствии авторизации на POST", async () => {
      const res = await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(createValidCertificate()),
      });
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на DELETE", async () => {
      const res = await certificatesRouter.request(
        "/me/certificates/РСО 'Российское общество оценщиков'",
        { method: "DELETE" },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("POST /me/certificates", () => {
    it("должен успешно добавить аттестат", async () => {
      const certificate = createValidCertificate();

      const res = await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(certificate),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;

      expect(data.qualificationCertificate).toHaveLength(1);
      expect(data.qualificationCertificate[0].issuedBy).toBe(
        certificate.issuedBy,
      );
      expect(
        data.qualificationCertificate[0].numberQualificationCertificate,
      ).toBe(certificate.numberQualificationCertificate);
    });

    it("НЕ должен возвращать passwordHash в ответе", async () => {
      const res = await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(createValidCertificate()),
      });

      const data = (await res.json()) as any;
      expect(data.passwordHash).toBeUndefined();
    });

    it("должен успешно добавить несколько аттестатов", async () => {
      const cert1 = createValidCertificate({
        numberQualificationCertificate: "А-12345",
        issuedBy: "РСО",
      });
      const cert2 = createValidCertificate({
        numberQualificationCertificate: "Б-67890",
        issuedBy: "НП ОЭС",
      });

      const res1 = await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(cert1),
      });
      expect(res1.status).toBe(201);

      const res2 = await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(cert2),
      });
      expect(res2.status).toBe(201);

      const data = (await res2.json()) as any;
      expect(data.qualificationCertificate).toHaveLength(2);
    });

    it("должен отказать при дублировании (issuedBy + numberQualificationCertificate)", async () => {
      const certificate = createValidCertificate();

      const res1 = await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(certificate),
      });
      expect(res1.status).toBe(201);

      const res2 = await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(certificate),
      });

      expect(res2.status).toBe(400);
      const data = (await res2.json()) as any;
      expect(data.error).toContain("уже существует");
    });

    it("должен разрешить аттестаты с одинаковым номером, но разными СРО", async () => {
      const cert1 = createValidCertificate({
        numberQualificationCertificate: "А-12345",
        issuedBy: "РСО",
      });
      const cert2 = createValidCertificate({
        numberQualificationCertificate: "А-12345", // Тот же номер
        issuedBy: "НП ОЭС", // Но другая СРО
      });

      const res1 = await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(cert1),
      });
      expect(res1.status).toBe(201);

      const res2 = await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(cert2),
      });
      expect(res2.status).toBe(201);

      const data = (await res2.json()) as any;
      expect(data.qualificationCertificate).toHaveLength(2);
    });

    it("должен отказать при невалидных данных (пустой issuedBy)", async () => {
      const certificate = createValidCertificate({ issuedBy: "" });

      const res = await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(certificate),
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при невалидных данных (отсутствует numberQualificationCertificate)", async () => {
      const certificate = createValidCertificate();
      delete (certificate as any).numberQualificationCertificate;

      const res = await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(certificate),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /me/certificates/:id", () => {
    it("должен успешно удалить аттестат по id", async () => {
      const certificate = createValidCertificate();

      const addRes = await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(certificate),
      });
      expect(addRes.status).toBe(201);

      const deleteRes = await certificatesRouter.request(
        `/me/certificates/${certificate.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(deleteRes.status).toBe(200);
      const data = (await deleteRes.json()) as any;
      expect(data.qualificationCertificate).toHaveLength(0);
    });

    it("должен удалить только указанный аттестат, оставляя остальные", async () => {
      const cert1 = createValidCertificate({
        id: crypto.randomUUID(),
        issuedBy: "РСО",
        numberQualificationCertificate: "А-12345",
      });
      const cert2 = createValidCertificate({
        id: crypto.randomUUID(),
        issuedBy: "РСО", // Та же СРО
        numberQualificationCertificate: "Б-67890", // Но другой номер
      });

      await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(cert1),
      });
      await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(cert2),
      });

      const deleteRes = await certificatesRouter.request(
        `/me/certificates/${cert1.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(deleteRes.status).toBe(200);
      const data = (await deleteRes.json()) as any;
      expect(data.qualificationCertificate).toHaveLength(1);
      expect(data.qualificationCertificate[0].id).toBe(cert2.id);
    });

    it("должен вернуть 200 с тем же пользователем, если аттестат не найден", async () => {
      const fakeId = crypto.randomUUID();
      const res = await certificatesRouter.request(
        `/me/certificates/${fakeId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.contacts.email).toBe(testEmail);
    });

    it("должен удалить только указанный аттестат, оставив остальные", async () => {
      const cert1 = createValidCertificate({
        issuedBy: "РСО",
        numberQualificationCertificate: "А-12345",
      });
      const cert2 = createValidCertificate({
        issuedBy: "НП ОЭС",
        numberQualificationCertificate: "Б-67890",
      });

      await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(cert1),
      });
      await certificatesRouter.request("/me/certificates", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...JSON_HEADERS },
        body: JSON.stringify(cert2),
      });

      const deleteRes = await certificatesRouter.request(
        `/me/certificates/${cert1.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      expect(deleteRes.status).toBe(200);
      const data = (await deleteRes.json()) as any;
      expect(data.qualificationCertificate).toHaveLength(1);
      expect(data.qualificationCertificate[0].id).toBe(cert2.id);
    });
  });
});
