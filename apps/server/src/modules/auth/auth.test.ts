import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { authRoutes } from "./routes";
import { ensureAppStructure } from "../../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";
import type { Appraiser } from "@appraisal/types";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-test-${crypto.randomUUID()}`,
);

type SafeAppraiser = Omit<Appraiser, "passwordHash" | "recoveryWordsHashes">;

interface RegisterOverrides {
  appraiser?: Partial<SafeAppraiser>;
  password?: string;
  recoveryWords?: string[];
}

function buildRegisterPayload(overrides: RegisterOverrides = {}) {
  return {
    appraiser: {
      id: "550e8400-e29b-41d4-a716-446655440000",
      fullName: "Иванов Иван Иванович",
      contacts: { email: "test@example.com", phone: "+79001234567" },
      ...overrides.appraiser,
    },
    password: overrides.password ?? "testpass123",
    recoveryWords: overrides.recoveryWords ?? [
      "яблоко",
      "банан",
      "вишня",
      "груша",
      "слива",
      "апельсин",
      "лимон",
      "манго",
      "персик",
      "абрикос",
      "киви",
      "ананас",
    ],
  };
}

async function registerAndLogin(overrides: RegisterOverrides = {}) {
  const payload = buildRegisterPayload(overrides);
  await authRoutes.request("/register", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  const res = await authRoutes.request("/login", {
    method: "POST",
    body: JSON.stringify({
      email: payload.appraiser.contacts!.email,
      password: payload.password,
    }),
    headers: { "Content-Type": "application/json" },
  });

  const data = (await res.json()) as { token: string; user: SafeAppraiser };
  return data.token;
}

describe("Auth Module API", () => {
  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    delete process.env.BASE_DIR;
  });

  describe("POST /register", () => {
    it("должен успешно зарегистрировать пользователя с минимальными данными", async () => {
      const res = await authRoutes.request("/register", {
        method: "POST",
        body: JSON.stringify(buildRegisterPayload()),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as SafeAppraiser;
      expect(data.fullName).toBe("Иванов Иван Иванович");
      expect(data).not.toHaveProperty("passwordHash");
      expect(data).not.toHaveProperty("recoveryWordsHashes");
      expect(data.hasPrivatePractice).toBe(false);
    });

    it("должен отказать при регистрации с дублирующимся email", async () => {
      await authRoutes.request("/register", {
        method: "POST",
        body: JSON.stringify(buildRegisterPayload()),
        headers: { "Content-Type": "application/json" },
      });

      const res = await authRoutes.request("/register", {
        method: "POST",
        body: JSON.stringify(buildRegisterPayload()),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe("Пользователь с таким email уже существует");
    });

    it("должен отказать при невалидном email", async () => {
      const res = await authRoutes.request("/register", {
        method: "POST",
        body: JSON.stringify(
          buildRegisterPayload({
            appraiser: {
              id: "550e8400-e29b-41d4-a716-446655440000",
              fullName: "Иванов Иван Иванович",
              contacts: { email: "email", phone: "+79001234567" },
            },
          }),
        ),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при коротком пароле", async () => {
      const res = await authRoutes.request("/register", {
        method: "POST",
        body: JSON.stringify(buildRegisterPayload({ password: "123" })),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при количестве recovery слов менее 12", async () => {
      const res = await authRoutes.request("/register", {
        method: "POST",
        body: JSON.stringify(
          buildRegisterPayload({
            recoveryWords: ["один", "два", "три"],
          }),
        ),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /login", () => {
    it("должен успешно авторизовать и вернуть токен", async () => {
      await authRoutes.request("/register", {
        method: "POST",
        body: JSON.stringify(buildRegisterPayload()),
        headers: { "Content-Type": "application/json" },
      });

      const res = await authRoutes.request("/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "testpass123",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { token: string; user: SafeAppraiser };
      expect(data.token).toBeDefined();
      expect(data.user.contacts.email).toBe("test@example.com");
    });

    it("должен отказать при неверном пароле", async () => {
      await authRoutes.request("/register", {
        method: "POST",
        body: JSON.stringify(buildRegisterPayload()),
        headers: { "Content-Type": "application/json" },
      });

      const res = await authRoutes.request("/login", {
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "wrong" }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(401);
    });

    it("должен отказать при несуществующем email", async () => {
      const res = await authRoutes.request("/login", {
        method: "POST",
        body: JSON.stringify({
          email: "nobody@example.com",
          password: "testpass123",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(401);
    });
  });

  describe("Защита эндпоинтов", () => {
    it("GET /me без токена должен вернуть 401", async () => {
      const res = await authRoutes.request("/me");
      expect(res.status).toBe(401);
    });

    it("PATCH /me/profile без токена должен вернуть 401", async () => {
      const res = await authRoutes.request("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ address: "Москва" }),
        headers: { "Content-Type": "application/json" },
      });
      expect(res.status).toBe(401);
    });

    it("POST /me/workplaces без токена должен вернуть 401", async () => {
      const res = await authRoutes.request("/me/workplaces", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /reset-password", () => {
    it("должен успешно сбросить пароль при 6 правильных словах", async () => {
      await authRoutes.request("/register", {
        method: "POST",
        body: JSON.stringify(buildRegisterPayload()),
        headers: { "Content-Type": "application/json" },
      });

      const res = await authRoutes.request("/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          recoveryWords: [
            "яблоко",
            "банан",
            "вишня",
            "груша",
            "слива",
            "апельсин",
          ],
          newPassword: "newpass456",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);

      const loginOld = await authRoutes.request("/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "testpass123",
        }),
        headers: { "Content-Type": "application/json" },
      });
      expect(loginOld.status).toBe(401);

      const loginNew = await authRoutes.request("/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "newpass456",
        }),
        headers: { "Content-Type": "application/json" },
      });
      expect(loginNew.status).toBe(200);
    });

    it("должен учитывать регистр и пробелы (нормализация)", async () => {
      await authRoutes.request("/register", {
        method: "POST",
        body: JSON.stringify(buildRegisterPayload()),
        headers: { "Content-Type": "application/json" },
      });

      const res = await authRoutes.request("/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          recoveryWords: [
            " ЯБЛОКО ",
            "Банан",
            "ВИШНЯ",
            "груша",
            " Слива",
            "апельсин ",
          ],
          newPassword: "newpass456",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(200);
    });

    it("должен отказать при дубликатах слов", async () => {
      await authRoutes.request("/register", {
        method: "POST",
        body: JSON.stringify(buildRegisterPayload()),
        headers: { "Content-Type": "application/json" },
      });

      const res = await authRoutes.request("/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          recoveryWords: [
            "яблоко",
            "яблоко",
            "яблоко",
            "яблоко",
            "яблоко",
            "яблоко",
          ],
          newPassword: "newpass456",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при 5 правильных словах (меньше 6)", async () => {
      await authRoutes.request("/register", {
        method: "POST",
        body: JSON.stringify(buildRegisterPayload()),
        headers: { "Content-Type": "application/json" },
      });

      const res = await authRoutes.request("/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          recoveryWords: ["яблоко", "банан", "вишня", "груша", "слива"],
          newPassword: "newpass456",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при 6 неправильных словах", async () => {
      await authRoutes.request("/register", {
        method: "POST",
        body: JSON.stringify(buildRegisterPayload()),
        headers: { "Content-Type": "application/json" },
      });

      const res = await authRoutes.request("/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          recoveryWords: [
            "красный",
            "синий",
            "зелёный",
            "жёлтый",
            "чёрный",
            "белый",
          ],
          newPassword: "newpass456",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при несуществующем email", async () => {
      const res = await authRoutes.request("/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email: "nobody@example.com",
          recoveryWords: [
            "яблоко",
            "банан",
            "вишня",
            "груша",
            "слива",
            "апельсин",
          ],
          newPassword: "newpass456",
        }),
        headers: { "Content-Type": "application/json" },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("Рабочие места", () => {
    const workplacePayload = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      legalForm: "ООО",
      fullName: "ООО 'Оценка'",
      shortName: "Оценка",
      regNumber: "1234567890123",
      regDate: "2010-01-01",
      taxIdentificationNumber: "7701234567",
      regReasonCodeTax: "123456789",
      regAddress: "г. Москва",
      physicalAddress: "г. Москва",
      contacts: { email: "office@ocenka.ru", phone: "+79009876543" },
      insurance: {
        nameInsuranceCompany: "СК",
        contractNumber: "INS-999",
        issueDate: "2023-01-01",
        validDateFrom: "2023-01-01",
        validDateTo: "2024-01-01",
        insuredAmount: "5000000",
      },
      appraiserId: "550e8400-e29b-41d4-a716-446655440000",
      providerDocumentList: [
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          name: "Документ",
          path: "/docs/документ.pdf",
        },
      ],
    };

    it("должен отказать при добавлении рабочего места с дублирующимся ID", async () => {
      const token = await registerAndLogin();

      await authRoutes.request("/me/workplaces", {
        method: "POST",
        body: JSON.stringify(workplacePayload),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const res = await authRoutes.request("/me/workplaces", {
        method: "POST",
        body: JSON.stringify(workplacePayload),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe("Рабочее место с таким ID уже существует");
    });

    it("должен сбросить defaultWorkplaceId при удалении соответствующего рабочего места", async () => {
      const token = await registerAndLogin();

      await authRoutes.request("/me/workplaces", {
        method: "POST",
        body: JSON.stringify(workplacePayload),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      await authRoutes.request("/me/profile", {
        method: "PATCH",
        body: JSON.stringify({ defaultWorkplaceId: workplacePayload.id }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const res = await authRoutes.request(
        `/me/workplaces/${workplacePayload.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const data = (await res.json()) as SafeAppraiser;
      expect(data.defaultWorkplaceId).toBeUndefined();
    });
  });

  describe("Аттестаты", () => {
    const certificatePayload = {
      issuedBy: "ФБУ «ФРЦ»",
      issuedDate: "2016-01-15",
      validDateFrom: "2016-01-15",
      validDateTo: "2026-01-15",
      numberQualificationCertificate: "АБ-123456",
    };

    it("должен отказать при добавлении дублирующегося аттестата", async () => {
      const token = await registerAndLogin();

      await authRoutes.request("/me/certificates", {
        method: "POST",
        body: JSON.stringify(certificatePayload),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const res = await authRoutes.request("/me/certificates", {
        method: "POST",
        body: JSON.stringify(certificatePayload),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe("Аттестат с таким номером уже существует");
    });
  });

  describe("Частная практика", () => {
    it("должен очистить privatePracticeInformation при выключении ЧПО", async () => {
      const token = await registerAndLogin();

      await authRoutes.request("/me/private-practice", {
        method: "PATCH",
        body: JSON.stringify({
          hasPrivatePractice: true,
          privatePracticeInformation: {
            id: "223e4567-e89b-12d3-a456-426614174000",
            legalForm: "Частнопрактикующий оценщик",
            regDate: "2019-05-10",
            documentName: "Свидетельство о постановке на учет",
            documentDate: "2019-05-10",
            documentNumber: "345678901234567",
            privatePracticeDocumentList: [],
          },
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const res = await authRoutes.request("/me/private-practice", {
        method: "PATCH",
        body: JSON.stringify({ hasPrivatePractice: false }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await res.json()) as SafeAppraiser;
      expect(data.hasPrivatePractice).toBe(false);
      expect(data.privatePracticeInformation).toBeUndefined();
    });
  });

  describe("POST /logout", () => {
    it("должен инвалидировать токен после выхода", async () => {
      const token = await registerAndLogin();

      const logoutRes = await authRoutes.request("/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(logoutRes.status).toBe(200);

      const meRes = await authRoutes.request("/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(meRes.status).toBe(401);
    });
  });
});
