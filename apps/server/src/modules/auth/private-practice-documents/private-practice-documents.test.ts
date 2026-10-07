import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { privatePracticeDocumentsRouter } from "./routes";
import { privatePracticeRouter } from "../private-practice/routes";
import { authRouter } from "../auth/routes";
import { ensureAppStructure } from "../../../services/storage";
import { sessionStore } from "../session";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-private-practice-documents-test-${crypto.randomUUID()}`,
);

function createMockFile(
  name: string,
  content: Uint8Array | string,
  type: string,
): File {
  const data =
    typeof content === "string" ? new TextEncoder().encode(content) : content;
  return new File([data], name, { type });
}

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

describe("Private Practice Documents Module API", () => {
  let token: string;
  let testEmail: string;

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    sessionStore.clear();

    testEmail = `pp-docs-user-${crypto.randomUUID().slice(0, 8)}@test.ru`;
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registerPayload),
    });

    const loginRes = await authRouter.request("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      const res = await privatePracticeDocumentsRouter.request(
        "/me/private-practice/documents",
      );
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на POST", async () => {
      const formData = new FormData();
      const file = createMockFile("test.pdf", "content", "application/pdf");
      formData.append("file", file);

      const res = await privatePracticeDocumentsRouter.request(
        "/me/private-practice/documents",
        { method: "POST", body: formData },
      );
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на DELETE", async () => {
      const res = await privatePracticeDocumentsRouter.request(
        `/me/private-practice/documents/${crypto.randomUUID()}`,
        { method: "DELETE" },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("Проверка активации частной практики", () => {
    it("должен отказать, если частная практика не активирована (GET)", async () => {
      const res = await privatePracticeDocumentsRouter.request(
        "/me/private-practice/documents",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Частная практика не активирована");
    });

    it("должен отказать, если частная практика не активирована (POST)", async () => {
      const file = createMockFile("test.pdf", "content", "application/pdf");
      const formData = new FormData();
      formData.append("file", file);

      const res = await privatePracticeDocumentsRouter.request(
        "/me/private-practice/documents",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );
      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Частная практика не активирована");
    });

    it("должен отказать, если частная практика не активирована (DELETE)", async () => {
      const res = await privatePracticeDocumentsRouter.request(
        `/me/private-practice/documents/${crypto.randomUUID()}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Частная практика не активирована");
    });
  });

  describe("Работа с активированной частной практикой", () => {
    beforeEach(async () => {
      const privatePracticeInfo = createValidPrivatePracticeInfo();
      const res = await privatePracticeRouter.request("/me/private-practice", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hasPrivatePractice: true,
          privatePracticeInformation: privatePracticeInfo,
        }),
      });
      expect(res.status).toBe(200);
    });

    describe("GET /me/private-practice/documents", () => {
      it("должен вернуть пустой массив, если документов нет", async () => {
        const res = await privatePracticeDocumentsRouter.request(
          "/me/private-practice/documents",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any[];
        expect(data).toEqual([]);
      });

      it("должен вернуть список загруженных документов", async () => {
        const file = createMockFile(
          "ogrnip.pdf",
          "PDF content",
          "application/pdf",
        );
        const formData = new FormData();
        formData.append("file", file);

        await privatePracticeDocumentsRouter.request(
          "/me/private-practice/documents",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );

        const res = await privatePracticeDocumentsRouter.request(
          "/me/private-practice/documents",
          { headers: { Authorization: `Bearer ${token}` } },
        );
        expect(res.status).toBe(200);
        const data = (await res.json()) as any[];
        expect(data).toHaveLength(1);
        expect(data[0].name).toBe("ogrnip.pdf");
      });
    });

    describe("POST /me/private-practice/documents", () => {
      it("должен успешно загрузить PDF-документ", async () => {
        const file = createMockFile(
          "ogrnip.pdf",
          "PDF content",
          "application/pdf",
        );
        const formData = new FormData();
        formData.append("file", file);

        const res = await privatePracticeDocumentsRouter.request(
          "/me/private-practice/documents",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );

        expect(res.status).toBe(201);
        const data = (await res.json()) as any;
        expect(
          data.privatePracticeInformation.privatePracticeDocumentList,
        ).toHaveLength(1);
        expect(
          data.privatePracticeInformation.privatePracticeDocumentList[0].name,
        ).toBe("ogrnip.pdf");
      });

      it("должен успешно загрузить DOCX-документ", async () => {
        const file = createMockFile(
          "certificate.docx",
          "DOCX content",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        );
        const formData = new FormData();
        formData.append("file", file);

        const res = await privatePracticeDocumentsRouter.request(
          "/me/private-practice/documents",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );

        expect(res.status).toBe(201);
        const data = (await res.json()) as any;
        expect(
          data.privatePracticeInformation.privatePracticeDocumentList,
        ).toHaveLength(1);
      });

      it("НЕ должен возвращать passwordHash в ответе", async () => {
        const file = createMockFile("test.pdf", "content", "application/pdf");
        const formData = new FormData();
        formData.append("file", file);

        const res = await privatePracticeDocumentsRouter.request(
          "/me/private-practice/documents",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );

        const data = (await res.json()) as any;
        expect(data.passwordHash).toBeUndefined();
      });

      it("должен отказать при загрузке неподдерживаемого типа файла", async () => {
        const file = createMockFile(
          "script.exe",
          "content",
          "application/x-msdownload",
        );
        const formData = new FormData();
        formData.append("file", file);

        const res = await privatePracticeDocumentsRouter.request(
          "/me/private-practice/documents",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );

        expect(res.status).toBe(400);
        const data = (await res.json()) as any;
        expect(data.error).toContain("Неподдерживаемый тип");
      });

      it("должен отказать, если файл не передан", async () => {
        const formData = new FormData();

        const res = await privatePracticeDocumentsRouter.request(
          "/me/private-practice/documents",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );

        expect(res.status).toBe(400);
        const data = (await res.json()) as any;
        expect(data.error).toContain("не передан");
      });
    });

    describe("DELETE /me/private-practice/documents/:id", () => {
      it("должен успешно удалить запись о документе (файл остаётся на диске)", async () => {
        const file = createMockFile("test.pdf", "content", "application/pdf");
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await privatePracticeDocumentsRouter.request(
          "/me/private-practice/documents",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          },
        );
        expect(uploadRes.status).toBe(201);

        const uploadData = (await uploadRes.json()) as any;
        const docId =
          uploadData.privatePracticeInformation.privatePracticeDocumentList[0]
            .id;
        const docPath =
          uploadData.privatePracticeInformation.privatePracticeDocumentList[0]
            .path;

        const fileExistsBefore = await fs
          .stat(docPath)
          .then(() => true)
          .catch(() => false);
        expect(fileExistsBefore).toBe(true);

        const deleteRes = await privatePracticeDocumentsRouter.request(
          `/me/private-practice/documents/${docId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        expect(deleteRes.status).toBe(200);

        const deleteData = (await deleteRes.json()) as any;
        expect(
          deleteData.privatePracticeInformation.privatePracticeDocumentList,
        ).toHaveLength(0);

        const fileExistsAfter = await fs
          .stat(docPath)
          .then(() => true)
          .catch(() => false);
        expect(fileExistsAfter).toBe(true);
      });

      it("должен вернуть 404 при удалении несуществующего документа", async () => {
        const res = await privatePracticeDocumentsRouter.request(
          `/me/private-practice/documents/${crypto.randomUUID()}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        expect(res.status).toBe(404);
      });
    });
  });
});
