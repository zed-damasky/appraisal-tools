import { Hono } from "hono";
import { getFileInfoForStreaming } from "./service";
import { fileExists } from "../../../services/documentStorage";

export const streamingRouter = new Hono();

function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "Не авторизован" }, 401);
  return null;
}

streamingRouter.get("/:reportId/stream/:fileId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("reportId");
    const fileId = c.req.param("fileId");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      ) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        fileId,
      )
    ) {
      return c.json({ error: "Невалидный ID" }, 400);
    }

    const fileInfo = await getFileInfoForStreaming(reportId, fileId);
    if (!fileInfo) {
      return c.json({ error: "Файл не найден в отчёте" }, 404);
    }

    const exists = await fileExists(fileInfo.fullPath);
    if (!exists) {
      return c.json({ error: "Физический файл отсутствует на диске" }, 404);
    }

    const isAttachment =
      fileInfo.meta.mimeType.includes("word") ||
      fileInfo.meta.mimeType.includes("msword");
    const disposition = isAttachment ? "attachment" : "inline";

    const bunFile = Bun.file(fileInfo.fullPath);

    return new Response(bunFile, {
      status: 200,
      headers: {
        "Content-Type": fileInfo.meta.mimeType,
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(fileInfo.meta.name)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка стриминга файла";
    return c.json({ error: message }, 500);
  }
});
