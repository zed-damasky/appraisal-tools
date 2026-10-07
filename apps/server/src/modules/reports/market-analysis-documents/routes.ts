import { Hono } from "hono";
import {
  getMarketAnalysisDocuments,
  addMarketAnalysisDocument,
  removeMarketAnalysisDocument,
  isValidChapterType,
} from "./service";
import { DocumentStorageError } from "../../../services/documentStorage";

export const marketAnalysisDocumentsRouter = new Hono();

function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "Не авторизован" }, 401);
  return null;
}

marketAnalysisDocumentsRouter.get(
  "/:id/market-analysis/:chapterType/documents",
  async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    try {
      const reportId = c.req.param("id");
      const chapterType = c.req.param("chapterType");

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          reportId,
        )
      ) {
        return c.json({ error: "Невалидный ID отчёта" }, 400);
      }

      if (!isValidChapterType(chapterType)) {
        return c.json(
          {
            error: `Недопустимый тип главы. Разрешены: macro, region, segment, analogues, nhue, liquidity, conclusions`,
          },
          400,
        );
      }

      const documents = await getMarketAnalysisDocuments(reportId, chapterType);
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
  },
);

marketAnalysisDocumentsRouter.post(
  "/:id/market-analysis/:chapterType/documents",
  async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    try {
      const reportId = c.req.param("id");
      const chapterType = c.req.param("chapterType");

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          reportId,
        )
      ) {
        return c.json({ error: "Невалидный ID отчёта" }, 400);
      }

      if (!isValidChapterType(chapterType)) {
        return c.json(
          {
            error: `Недопустимый тип главы. Разрешены: macro, region, segment, analogues, nhue, liquidity, conclusions`,
          },
          400,
        );
      }

      const folder = c.req.query("folder") || undefined;
      const formData = await c.req.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return c.json({ error: "Файл не передан" }, 400);
      }

      const chapter = await addMarketAnalysisDocument(
        reportId,
        chapterType,
        file,
        folder,
      );

      return c.json(chapter, 201);
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
  },
);

marketAnalysisDocumentsRouter.delete(
  "/:id/market-analysis/:chapterType/documents/:docId",
  async (c) => {
    const authError = requireAuth(c);
    if (authError) return authError;

    try {
      const reportId = c.req.param("id");
      const chapterType = c.req.param("chapterType");
      const documentId = c.req.param("docId");

      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          reportId,
        )
      ) {
        return c.json({ error: "Невалидный ID отчёта" }, 400);
      }

      if (!isValidChapterType(chapterType)) {
        return c.json(
          {
            error: `Недопустимый тип главы. Разрешены: macro, region, segment, analogues, nhue, liquidity, conclusions`,
          },
          400,
        );
      }

      const success = await removeMarketAnalysisDocument(
        reportId,
        chapterType,
        documentId,
      );
      if (!success) {
        return c.json({ error: "Документ не найден" }, 404);
      }

      return c.json({ message: "Документ удалён из главы анализа рынка" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ошибка удаления документа";
      if (message === "Отчёт не найден") return c.json({ error: message }, 404);
      return c.json({ error: message }, 500);
    }
  },
);
