import { Hono } from "hono";
import {
  getPersonalDocuments,
  addPersonalDocument,
  removePersonalDocument,
} from "./service";
import {
  requireAuth,
  sanitizeAppraiser,
  getAuthenticatedEmail,
} from "../session";

export const personalDocumentsRouter = new Hono();

personalDocumentsRouter.get("/me/personal-documents", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const email = getAuthenticatedEmail(c)!;
    const documents = await getPersonalDocuments(email);

    if (documents === null) {
      return c.json({ error: "Пользователь не найден" }, 404);
    }

    return c.json(documents);
  } catch (error) {
    return c.json({ error: "Ошибка получения документов" }, 500);
  }
});

personalDocumentsRouter.post("/me/personal-documents", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const email = getAuthenticatedEmail(c)!;
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "Файл не передан" }, 400);
    }

    const updatedUser = await addPersonalDocument(email, file);
    if (!updatedUser) {
      return c.json({ error: "Пользователь не найден" }, 404);
    }

    return c.json(sanitizeAppraiser(updatedUser), 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка загрузки документа";
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
});

personalDocumentsRouter.delete("/me/personal-documents/:id", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const email = getAuthenticatedEmail(c)!;
    const documentId = c.req.param("id");
    const updatedUser = await removePersonalDocument(email, documentId);

    if (!updatedUser) {
      return c.json({ error: "Документ не найден" }, 404);
    }

    return c.json(sanitizeAppraiser(updatedUser));
  } catch (error) {
    return c.json({ error: "Ошибка удаления документа" }, 500);
  }
});
