import { Hono } from "hono";
import {
  getWorkplaceDocuments,
  addWorkplaceDocument,
  removeWorkplaceDocument,
} from "./service";
import {
  requireAuth,
  sanitizeAppraiser,
  getAuthenticatedEmail,
} from "../session";

export const workplaceDocumentsRouter = new Hono();

workplaceDocumentsRouter.get(
  "/me/workplaces/:workplaceId/documents",
  async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    try {
      const email = getAuthenticatedEmail(c)!;
      const workplaceId = c.req.param("workplaceId");
      const documents = await getWorkplaceDocuments(email, workplaceId);

      if (documents === null) {
        return c.json({ error: "Рабочее место не найдено" }, 404);
      }

      return c.json(documents);
    } catch (error) {
      return c.json({ error: "Ошибка получения документов" }, 500);
    }
  },
);

workplaceDocumentsRouter.post(
  "/me/workplaces/:workplaceId/documents",
  async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    try {
      const email = getAuthenticatedEmail(c)!;
      const workplaceId = c.req.param("workplaceId");
      const formData = await c.req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return c.json({ error: "Файл не передан" }, 400);
      }

      const updatedUser = await addWorkplaceDocument(email, workplaceId, file);
      if (!updatedUser) {
        return c.json({ error: "Пользователь не найден" }, 404);
      }

      return c.json(sanitizeAppraiser(updatedUser), 201);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ошибка загрузки документа";
      if (message === "Рабочее место не найдено") {
        return c.json({ error: message }, 404);
      }
      if (
        message.includes("слишком большой") ||
        message.includes("Неподдерживаемый") ||
        message.includes("Файл пуст") ||
        message.includes("Расширение файла не соответствует")
      ) {
        return c.json({ error: message }, 400);
      }
      return c.json({ error: message }, 500);
    }
  },
);

workplaceDocumentsRouter.delete(
  "/me/workplaces/:workplaceId/documents/:docId",
  async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    try {
      const email = getAuthenticatedEmail(c)!;
      const workplaceId = c.req.param("workplaceId");
      const documentId = c.req.param("docId");
      const updatedUser = await removeWorkplaceDocument(
        email,
        workplaceId,
        documentId,
      );

      if (!updatedUser) {
        return c.json({ error: "Документ не найден" }, 404);
      }

      return c.json(sanitizeAppraiser(updatedUser));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ошибка удаления документа";
      if (message === "Рабочее место не найдено") {
        return c.json({ error: message }, 404);
      }
      return c.json({ error: message }, 500);
    }
  },
);
