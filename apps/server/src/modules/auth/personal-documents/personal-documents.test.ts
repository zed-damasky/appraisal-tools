import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { personalDocumentsRouter } from "./routes";
import { authRouter } from "../auth/routes";
import { ensureAppStructure } from "../../../services/storage";
import { sessionStore } from "../session";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-personal-documents-test-${crypto.randomUUID()}`,
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

describe("Personal Documents Module API", () => {
  let token: string;
  let testEmail: string;

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    sessionStore.clear();

    testEmail = `docs-user-${crypto.randomUUID().slice(0, 8)}@test.ru`;
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
      const res = await personalDocumentsRouter.request(
        "/me/personal-documents",
      );
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на POST", async () => {
      const formData = new FormData();
      const file = createMockFile("test.pdf", "content", "application/pdf");
      formData.append("file", file);

      const res = await personalDocumentsRouter.request(
        "/me/personal-documents",
        {
          method: "POST",
          body: formData,
        },
      );
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на DELETE", async () => {
      const res = await personalDocumentsRouter.request(
        `/me/personal-documents/${crypto.randomUUID()}`,
        { method: "DELETE" },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /me/personal-documents", () => {
    it("должен вернуть пустой массив, если документов нет", async () => {
      const res = await personalDocumentsRouter.request(
        "/me/personal-documents",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toEqual([]);
    });

    it("должен вернуть список загруженных документов", async () => {
      const file = createMockFile(
        "diploma.pdf",
        "PDF content",
        "application/pdf",
      );
      const formData = new FormData();
      formData.append("file", file);

      await personalDocumentsRouter.request("/me/personal-documents", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const res = await personalDocumentsRouter.request(
        "/me/personal-documents",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("diploma.pdf");
      expect(data[0].mimeType).toBe("application/pdf");
    });
  });

  describe("POST /me/personal-documents", () => {
    it("должен успешно загрузить PDF-документ", async () => {
      const file = createMockFile(
        "diploma.pdf",
        "PDF content",
        "application/pdf",
      );
      const formData = new FormData();
      formData.append("file", file);

      const res = await personalDocumentsRouter.request(
        "/me/personal-documents",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.personalDocumentList).toHaveLength(1);
      expect(data.personalDocumentList[0].name).toBe("diploma.pdf");
      expect(data.personalDocumentList[0].mimeType).toBe("application/pdf");
    });

    it("должен успешно загрузить DOCX-документ", async () => {
      const file = createMockFile(
        "certificate.docx",
        "DOCX content",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      const formData = new FormData();
      formData.append("file", file);

      const res = await personalDocumentsRouter.request(
        "/me/personal-documents",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.personalDocumentList).toHaveLength(1);
      expect(data.personalDocumentList[0].name).toBe("certificate.docx");
    });

    it("должен успешно загрузить изображение", async () => {
      const file = createMockFile("photo.jpg", "JPEG data", "image/jpeg");
      const formData = new FormData();
      formData.append("file", file);

      const res = await personalDocumentsRouter.request(
        "/me/personal-documents",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.personalDocumentList).toHaveLength(1);
      expect(data.personalDocumentList[0].mimeType).toBe("image/jpeg");
    });

    it("НЕ должен возвращать passwordHash в ответе", async () => {
      const file = createMockFile("test.pdf", "content", "application/pdf");
      const formData = new FormData();
      formData.append("file", file);

      const res = await personalDocumentsRouter.request(
        "/me/personal-documents",
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

      const res = await personalDocumentsRouter.request(
        "/me/personal-documents",
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

      const res = await personalDocumentsRouter.request(
        "/me/personal-documents",
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

  describe("DELETE /me/personal-documents/:id", () => {
    it("должен успешно удалить запись о документе (файл остаётся на диске)", async () => {
      const file = createMockFile("test.pdf", "content", "application/pdf");
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await personalDocumentsRouter.request(
        "/me/personal-documents",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );
      expect(uploadRes.status).toBe(201);

      const uploadData = (await uploadRes.json()) as any;
      const docId = uploadData.personalDocumentList[0].id;
      const docPath = uploadData.personalDocumentList[0].path;

      const fileExistsBefore = await fs
        .stat(docPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExistsBefore).toBe(true);

      const deleteRes = await personalDocumentsRouter.request(
        `/me/personal-documents/${docId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(deleteRes.status).toBe(200);

      const deleteData = (await deleteRes.json()) as any;
      expect(deleteData.personalDocumentList).toHaveLength(0);

      const fileExistsAfter = await fs
        .stat(docPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExistsAfter).toBe(true);
    });

    it("должен вернуть 404 при удалении несуществующего документа", async () => {
      const res = await personalDocumentsRouter.request(
        `/me/personal-documents/${crypto.randomUUID()}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(res.status).toBe(404);
    });
  });
});
