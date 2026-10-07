import { Hono } from "hono";
import {
  getReportDocuments,
  addReportDocument,
  removeReportDocument,
} from "./service";
import { DocumentStorageError } from "../../../services/documentStorage";

export const reportDocumentsRouter = new Hono();

function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "Не авторизован" }, 401);
  return null;
}

reportDocumentsRouter.get("/:id/documents", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      )
    ) {
      return c.json({ error: "Невалидный ID отчёта" }, 400);
    }

    const documents = await getReportDocuments(reportId);
    if (documents === null) {
      return c.json({ error: "Отчёт не найден" }, 404);
    }

    return c.json(documents);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка получения документов";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    return c.json({ error: message }, 500);
  }
});

reportDocumentsRouter.post("/:id/documents", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      )
    ) {
      return c.json({ error: "Невалидный ID отчёта" }, 400);
    }

    const folder = c.req.query("folder") || undefined;
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "Файл не передан" }, 400);
    }

    await addReportDocument(reportId, file, folder);

    const documents = await getReportDocuments(reportId);
    return c.json(documents, 201);
  } catch (error) {
    if (error instanceof DocumentStorageError) {
      return c.json({ error: error.message }, 400);
    }

    if (error instanceof Error && error.message === "Отчёт не найден") {
      return c.json({ error: error.message }, 404);
    }

    const message =
      error instanceof Error ? error.message : "Ошибка загрузки документа";
    return c.json({ error: message }, 500);
  }
});

reportDocumentsRouter.delete("/:id/documents/:docId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    const documentId = c.req.param("docId");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      )
    ) {
      return c.json({ error: "Невалидный ID отчёта" }, 400);
    }

    const updatedReport = await removeReportDocument(reportId, documentId);
    if (!updatedReport) {
      return c.json({ error: "Документ не найден" }, 404);
    }

    return c.json({ message: "Документ удалён из отчёта" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка удаления документа";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    return c.json({ error: message }, 500);
  }
});
