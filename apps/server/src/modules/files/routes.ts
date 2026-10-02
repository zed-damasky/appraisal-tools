import { Hono } from "hono";
import { uploadFile, deleteFile, getFileInfo } from "./service";
import { existsSync } from "fs";

const router = new Hono();

function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "Не авторизован" }, 401);
  return null;
}

router.post("/:reportId/files/:category", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("reportId");
    const category = c.req.param("category") as "photos" | "docs";

    if (category !== "photos" && category !== "docs") {
      return c.json({ error: "Неверная категория" }, 400);
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return c.json({ error: "Файл не найден в запросе" }, 400);

    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return c.json({ error: "Размер файла превышает 50 МБ" }, 400);
    }

    const newDoc = await uploadFile(reportId, category, file);
    return c.json(newDoc, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка загрузки";
    return c.json({ error: message }, 400);
  }
});

router.delete("/:reportId/files/:category/:fileId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("reportId");
    const category = c.req.param("category") as "photos" | "docs";
    const fileId = c.req.param("fileId");

    if (category !== "photos" && category !== "docs") {
      return c.json({ error: "Неверная категория" }, 400);
    }

    const success = await deleteFile(reportId, category, fileId);
    if (!success) return c.json({ error: "Файл не найден в отчёте" }, 404);

    return c.json({
      message: "Файл удалён из отчёта (физический файл сохранён на диске)",
    });
  } catch (error) {
    return c.json({ error: "Ошибка удаления" }, 500);
  }
});

router.get("/:reportId/files/:category/:fileId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("reportId");
    const category = c.req.param("category") as "photos" | "docs";
    const fileId = c.req.param("fileId");

    if (category !== "photos" && category !== "docs") {
      return c.json({ error: "Неверная категория" }, 400);
    }

    const fileInfo = await getFileInfo(reportId, category, fileId);
    if (!fileInfo) return c.json({ error: "Файл не найден" }, 404);

    if (!existsSync(fileInfo.fullPath)) {
      return c.json({ error: "Физический файл отсутствует на диске" }, 404);
    }

    const bunFile = Bun.file(fileInfo.fullPath);
    return new Response(bunFile, {
      status: 200,
      headers: {
        "Content-Type": fileInfo.meta.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileInfo.meta.name)}"`,
      },
    });
  } catch (error) {
    return c.json({ error: "Ошибка чтения файла" }, 500);
  }
});

export const filesRoutes = router;
