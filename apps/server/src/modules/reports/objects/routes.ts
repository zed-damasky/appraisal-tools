import { Hono } from "hono";
import {
  getReportObjects,
  getObjectById,
  addObjectToReport,
  updateObjectInReport,
  removeObjectFromReport,
} from "./service";

export const objectsRouter = new Hono();

function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "Не авторизован" }, 401);
  return null;
}

objectsRouter.get("/:id/objects", async (c) => {
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

    const objects = await getReportObjects(reportId);
    return c.json(objects);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка получения объектов";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    return c.json({ error: message }, 500);
  }
});

objectsRouter.get("/:id/objects/:objectId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    const objectId = c.req.param("objectId");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      ) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        objectId,
      )
    ) {
      return c.json({ error: "Невалидный ID" }, 400);
    }

    const object = await getObjectById(reportId, objectId);
    if (!object) return c.json({ error: "Объект не найден" }, 404);

    return c.json(object);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка получения объекта";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    return c.json({ error: message }, 500);
  }
});

objectsRouter.post("/:id/objects", async (c) => {
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

    const body = await c.req.json();
    const newObject = await addObjectToReport(reportId, body);
    return c.json(newObject, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка добавления объекта";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    if (
      message.includes("Невалидные данные") ||
      message.includes("уже существует") ||
      message.includes("не найден в отчёте")
    ) {
      return c.json({ error: message }, 400);
    }
    return c.json({ error: message }, 500);
  }
});

objectsRouter.put("/:id/objects/:objectId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    const objectId = c.req.param("objectId");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      ) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        objectId,
      )
    ) {
      return c.json({ error: "Невалидный ID" }, 400);
    }

    const body = await c.req.json();
    const updatedObject = await updateObjectInReport(reportId, objectId, body);
    if (!updatedObject) return c.json({ error: "Объект не найден" }, 404);

    return c.json(updatedObject);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка обновления объекта";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    if (
      message.includes("Невалидные данные") ||
      message.includes("не найден в отчёте")
    ) {
      return c.json({ error: message }, 400);
    }
    return c.json({ error: message }, 500);
  }
});

objectsRouter.delete("/:id/objects/:objectId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    const objectId = c.req.param("objectId");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      ) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        objectId,
      )
    ) {
      return c.json({ error: "Невалидный ID" }, 400);
    }

    const success = await removeObjectFromReport(reportId, objectId);
    if (!success) return c.json({ error: "Объект не найден" }, 404);

    return c.json({ message: "Объект успешно удалён из отчёта" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка удаления объекта";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    if (message.includes("ссылаются другие объекты"))
      return c.json({ error: message }, 400);
    return c.json({ error: message }, 500);
  }
});
