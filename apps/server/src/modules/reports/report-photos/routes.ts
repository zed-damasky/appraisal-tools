import { Hono } from "hono";
import { getReportPhotos, addReportPhoto, removeReportPhoto } from "./service";
import { DocumentStorageError } from "../../../services/documentStorage";

export const reportPhotosRouter = new Hono();

function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "Не авторизован" }, 401);
  return null;
}

reportPhotosRouter.get("/:id/photos", async (c) => {
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

    const photos = await getReportPhotos(reportId);
    if (photos === null) {
      return c.json({ error: "Отчёт не найден" }, 404);
    }

    return c.json(photos);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка получения фотографий";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    return c.json({ error: message }, 500);
  }
});

reportPhotosRouter.post("/:id/photos", async (c) => {
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

    await addReportPhoto(reportId, file, folder);

    const photos = await getReportPhotos(reportId);
    return c.json(photos, 201);
  } catch (error) {
    if (error instanceof DocumentStorageError) {
      return c.json({ error: error.message }, 400);
    }

    if (error instanceof Error && error.message === "Отчёт не найден") {
      return c.json({ error: error.message }, 404);
    }

    const message =
      error instanceof Error ? error.message : "Ошибка загрузки фотографии";
    return c.json({ error: message }, 500);
  }
});

reportPhotosRouter.delete("/:id/photos/:photoId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    const photoId = c.req.param("photoId");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      )
    ) {
      return c.json({ error: "Невалидный ID отчёта" }, 400);
    }

    const updatedReport = await removeReportPhoto(reportId, photoId);
    if (!updatedReport) {
      return c.json({ error: "Фотография не найдена" }, 404);
    }

    return c.json({ message: "Фотография удалена из отчёта" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка удаления фотографии";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    return c.json({ error: message }, 500);
  }
});
