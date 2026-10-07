import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { workplaceDocumentsRouter } from "./routes";
import { workplacesRouter } from "../workplaces/routes";
import { authRouter } from "../auth/routes";
import { ensureAppStructure } from "../../../services/storage";
import { sessionStore } from "../session";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-workplace-documents-test-${crypto.randomUUID()}`,
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

function createValidWorkplace(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    legalForm: "ООО",
    fullName: "ООО 'Оценочная компания Ромашка'",
    shortName: "ООО 'Ромашка'",
    regNumber: "1234567890123",
    regDate: "2010-01-01",
    taxIdentificationNumber: "1234567890",
    regReasonCodeTax: "123456789",
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

describe("Workplace Documents Module API", () => {
  let token: string;
  let testEmail: string;
  let workplaceId: string;

  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);

    sessionStore.clear();

    testEmail = `wp-docs-user-${crypto.randomUUID().slice(0, 8)}@test.ru`;
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

    const workplace = createValidWorkplace();
    workplaceId = workplace.id;

    const wpRes = await workplacesRouter.request("/me/workplaces", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(workplace),
    });
    expect(wpRes.status).toBe(201);
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    delete process.env.BASE_DIR;
    sessionStore.clear();
  });

  describe("Защита эндпоинтов", () => {
    it("должен вернуть 401 при отсутствии авторизации на GET", async () => {
      const res = await workplaceDocumentsRouter.request(
        `/me/workplaces/${workplaceId}/documents`,
      );
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на POST", async () => {
      const formData = new FormData();
      const file = createMockFile("test.pdf", "content", "application/pdf");
      formData.append("file", file);

      const res = await workplaceDocumentsRouter.request(
        `/me/workplaces/${workplaceId}/documents`,
        { method: "POST", body: formData },
      );
      expect(res.status).toBe(401);
    });

    it("должен вернуть 401 при отсутствии авторизации на DELETE", async () => {
      const res = await workplaceDocumentsRouter.request(
        `/me/workplaces/${workplaceId}/documents/${crypto.randomUUID()}`,
        { method: "DELETE" },
      );
      expect(res.status).toBe(401);
    });
  });

  describe("GET /me/workplaces/:workplaceId/documents", () => {
    it("должен вернуть список документов рабочего места", async () => {
      const res = await workplaceDocumentsRouter.request(
        `/me/workplaces/${workplaceId}/documents`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe("Устав.pdf");
    });

    it("должен вернуть 404 для несуществующего рабочего места", async () => {
      const fakeId = crypto.randomUUID();
      const res = await workplaceDocumentsRouter.request(
        `/me/workplaces/${fakeId}/documents`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(res.status).toBe(404);
    });
  });

  describe("POST /me/workplaces/:workplaceId/documents", () => {
    it("должен успешно загрузить PDF-документ", async () => {
      const file = createMockFile(
        "charter.pdf",
        "PDF content",
        "application/pdf",
      );
      const formData = new FormData();
      formData.append("file", file);

      const res = await workplaceDocumentsRouter.request(
        `/me/workplaces/${workplaceId}/documents`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      const workplace = data.workPlaceList.find(
        (w: any) => w.id === workplaceId,
      );
      expect(workplace.providerDocumentList).toHaveLength(2);
      expect(workplace.providerDocumentList[1].name).toBe("charter.pdf");
    });

    it("должен успешно загрузить DOCX-документ", async () => {
      const file = createMockFile(
        "certificate.docx",
        "DOCX content",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      );
      const formData = new FormData();
      formData.append("file", file);

      const res = await workplaceDocumentsRouter.request(
        `/me/workplaces/${workplaceId}/documents`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      const workplace = data.workPlaceList.find(
        (w: any) => w.id === workplaceId,
      );
      expect(workplace.providerDocumentList).toHaveLength(2);
    });

    it("НЕ должен возвращать passwordHash в ответе", async () => {
      const file = createMockFile("test.pdf", "content", "application/pdf");
      const formData = new FormData();
      formData.append("file", file);

      const res = await workplaceDocumentsRouter.request(
        `/me/workplaces/${workplaceId}/documents`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      const data = (await res.json()) as any;
      expect(data.passwordHash).toBeUndefined();
    });

    it("должен отказать для несуществующего рабочего места", async () => {
      const fakeId = crypto.randomUUID();
      const file = createMockFile("test.pdf", "content", "application/pdf");
      const formData = new FormData();
      formData.append("file", file);

      const res = await workplaceDocumentsRouter.request(
        `/me/workplaces/${fakeId}/documents`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      expect(res.status).toBe(404);
      const data = (await res.json()) as any;
      expect(data.error).toContain("Рабочее место не найдено");
    });

    it("должен отказать при загрузке неподдерживаемого типа файла", async () => {
      const file = createMockFile(
        "script.exe",
        "content",
        "application/x-msdownload",
      );
      const formData = new FormData();
      formData.append("file", file);

      const res = await workplaceDocumentsRouter.request(
        `/me/workplaces/${workplaceId}/documents`,
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

      const res = await workplaceDocumentsRouter.request(
        `/me/workplaces/${workplaceId}/documents`,
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

  describe("DELETE /me/workplaces/:workplaceId/documents/:docId", () => {
    it("должен успешно удалить запись о документе (файл остаётся на диске)", async () => {
      const file = createMockFile("test.pdf", "content", "application/pdf");
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await workplaceDocumentsRouter.request(
        `/me/workplaces/${workplaceId}/documents`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );
      expect(uploadRes.status).toBe(201);

      const uploadData = (await uploadRes.json()) as any;
      const workplace = uploadData.workPlaceList.find(
        (w: any) => w.id === workplaceId,
      );
      const newDoc = workplace.providerDocumentList.find(
        (d: any) => d.name === "test.pdf",
      );
      const docId = newDoc.id;
      const docPath = newDoc.path;

      const fileExistsBefore = await fs
        .stat(docPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExistsBefore).toBe(true);

      const deleteRes = await workplaceDocumentsRouter.request(
        `/me/workplaces/${workplaceId}/documents/${docId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(deleteRes.status).toBe(200);

      const deleteData = (await deleteRes.json()) as any;
      const updatedWorkplace = deleteData.workPlaceList.find(
        (w: any) => w.id === workplaceId,
      );
      expect(updatedWorkplace.providerDocumentList).toHaveLength(1);
      expect(updatedWorkplace.providerDocumentList[0].name).toBe("Устав.pdf");

      const fileExistsAfter = await fs
        .stat(docPath)
        .then(() => true)
        .catch(() => false);
      expect(fileExistsAfter).toBe(true);
    });

    it("должен вернуть 404 для несуществующего рабочего места", async () => {
      const fakeWorkplaceId = crypto.randomUUID();
      const res = await workplaceDocumentsRouter.request(
        `/me/workplaces/${fakeWorkplaceId}/documents/${crypto.randomUUID()}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(res.status).toBe(404);
    });

    it("должен вернуть 404 при удалении несуществующего документа", async () => {
      const res = await workplaceDocumentsRouter.request(
        `/me/workplaces/${workplaceId}/documents/${crypto.randomUUID()}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      expect(res.status).toBe(404);
    });
  });
});
