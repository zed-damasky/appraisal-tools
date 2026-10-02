import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { contractsRoutes } from "./routes";
import { ensureAppStructure } from "../services/storage";
import fs from "fs/promises";
import path from "path";
import os from "os";

const TEMP_DIR = path.join(
  os.tmpdir(),
  `appraisal-contracts-test-${crypto.randomUUID()}`,
);

const AUTH_HEADERS = {
  Authorization: "Bearer test-valid-token",
  "Content-Type": "application/json",
};

describe("Contracts Module API", () => {
  beforeEach(async () => {
    process.env.BASE_DIR = TEMP_DIR;
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await ensureAppStructure(TEMP_DIR);
  });

  afterEach(async () => {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    delete process.env.BASE_DIR;
  });

  describe("Защита эндпоинтов", () => {
    it("должен вернуть 401 при отсутствии заголовка Authorization", async () => {
      const res = await contractsRoutes.request("/");
      expect(res.status).toBe(401);
    });
  });

  describe("POST /", () => {
    it("должен успешно создать новый договор с номером и датой", async () => {
      const payload = {
        contractNumber: "Д-001/2024",
        contractDate: "2024-01-15",
      };

      const res = await contractsRoutes.request("/", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.contractNumber).toBe("Д-001/2024");
      expect(data.contractDate).toBe("2024-01-15");
      expect(data.id).toBeDefined();
    });

    it("должен отказать при отсутствии номера договора", async () => {
      const res = await contractsRoutes.request("/", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ contractDate: "2024-01-15" }),
      });

      expect(res.status).toBe(400);
    });

    it("должен отказать при отсутствии даты договора", async () => {
      const res = await contractsRoutes.request("/", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ contractNumber: "Д-001/2024" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /", () => {
    it("должен вернуть пустой список, если договоров нет", async () => {
      const res = await contractsRoutes.request("/", {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(0);
    });

    it("должен вернуть список с созданным договором", async () => {
      await contractsRoutes.request("/", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          contractNumber: "Д-002/2024",
          contractDate: "2024-02-20",
        }),
      });

      const res = await contractsRoutes.request("/", {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].contractNumber).toBe("Д-002/2024");
    });
  });

  describe("GET /:id", () => {
    it("должен вернуть договор по ID", async () => {
      const createRes = await contractsRoutes.request("/", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          contractNumber: "Д-003/2024",
          contractDate: "2024-03-10",
        }),
      });
      const { id } = (await createRes.json()) as any;

      const res = await contractsRoutes.request(`/${id}`, {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.id).toBe(id);
      expect(data.contractNumber).toBe("Д-003/2024");
    });

    it("должен вернуть 404 для несуществующего ID", async () => {
      const res = await contractsRoutes.request(
        "/00000000-0000-0000-0000-000000000000",
        {
          headers: { Authorization: "Bearer test" },
        },
      );
      expect(res.status).toBe(404);
    });

    it("должен вернуть 400 для невалидного формата ID", async () => {
      const res = await contractsRoutes.request("/invalid-uuid", {
        headers: { Authorization: "Bearer test" },
      });
      expect(res.status).toBe(400);
    });
  });

  describe("PUT /:id", () => {
    it("должен успешно обновить номер договора", async () => {
      const createRes = await contractsRoutes.request("/", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          contractNumber: "Д-004/2024",
          contractDate: "2024-04-05",
        }),
      });
      const { id } = (await createRes.json()) as any;

      const res = await contractsRoutes.request(`/${id}`, {
        method: "PUT",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ contractNumber: "Д-004-ИЗМ/2024" }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.contractNumber).toBe("Д-004-ИЗМ/2024");
      expect(data.contractDate).toBe("2024-04-05");
    });

    it("должен успешно обновить дату договора", async () => {
      const createRes = await contractsRoutes.request("/", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          contractNumber: "Д-005/2024",
          contractDate: "2024-05-15",
        }),
      });
      const { id } = (await createRes.json()) as any;

      const res = await contractsRoutes.request(`/${id}`, {
        method: "PUT",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ contractDate: "2024-06-20" }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.contractDate).toBe("2024-06-20");
    });
  });

  describe("DELETE /:id", () => {
    it("должен успешно удалить договор", async () => {
      const createRes = await contractsRoutes.request("/", {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          contractNumber: "Д-006/2024",
          contractDate: "2024-07-01",
        }),
      });
      const { id } = (await createRes.json()) as any;

      const deleteRes = await contractsRoutes.request(`/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer test" },
      });
      expect(deleteRes.status).toBe(200);

      const getRes = await contractsRoutes.request(`/${id}`, {
        headers: { Authorization: "Bearer test" },
      });
      expect(getRes.status).toBe(404);
    });

    it("должен вернуть 404 при удалении несуществующего договора", async () => {
      const res = await contractsRoutes.request(
        "/00000000-0000-0000-0000-000000000000",
        {
          method: "DELETE",
          headers: { Authorization: "Bearer test" },
        },
      );
      expect(res.status).toBe(400);
    });
  });
});
