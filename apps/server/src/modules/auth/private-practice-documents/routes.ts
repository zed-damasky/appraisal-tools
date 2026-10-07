import { Hono } from "hono";
import {
  getPrivatePracticeDocuments,
  addPrivatePracticeDocument,
  removePrivatePracticeDocument,
} from "./service";
import {
  requireAuth,
  sanitizeAppraiser,
  getAuthenticatedEmail,
} from "../session";

export const privatePracticeDocumentsRouter = new Hono();

privatePracticeDocumentsRouter.get(
  "/me/private-practice/documents",
  async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    try {
      const email = getAuthenticatedEmail(c)!;
      const documents = await getPrivatePracticeDocuments(email);

      if (documents === null) {
        return c.json({ error: "Пользователь не найден" }, 404);
      }

      return c.json(documents);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ошибка получения документов";
      if (message === "Частная практика не активирована") {
        return c.json({ error: message }, 400);
      }
      return c.json({ error: message }, 500);
    }
  },
);

privatePracticeDocumentsRouter.post(
  "/me/private-practice/documents",
  async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    try {
      const email = getAuthenticatedEmail(c)!;
      const formData = await c.req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return c.json({ error: "Файл не передан" }, 400);
      }

      const updatedUser = await addPrivatePracticeDocument(email, file);
      if (!updatedUser) {
        return c.json({ error: "Пользователь не найден" }, 404);
      }

      return c.json(sanitizeAppraiser(updatedUser), 201);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ошибка загрузки документа";
      if (message === "Частная практика не активирована") {
        return c.json({ error: message }, 400);
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

privatePracticeDocumentsRouter.delete(
  "/me/private-practice/documents/:id",
  async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    try {
      const email = getAuthenticatedEmail(c)!;
      const documentId = c.req.param("id");
      const updatedUser = await removePrivatePracticeDocument(
        email,
        documentId,
      );

      if (!updatedUser) {
        return c.json({ error: "Документ не найден" }, 404);
      }

      return c.json(sanitizeAppraiser(updatedUser));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ошибка удаления документа";
      if (message === "Частная практика не активирована") {
        return c.json({ error: message }, 400);
      }
      return c.json({ error: message }, 500);
    }
  },
);
