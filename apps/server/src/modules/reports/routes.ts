import { Hono } from "hono";
import { z } from "zod";
import {
  getReportsList,
  getReportById,
  createReport,
  updateReport,
  deleteReportById,
  duplicateReport,
  changeReportStatus,
  removeObjectFromReport,
  getReportObjects,
  getObjectById,
  addObjectToReport,
  updateObjectInReport,
} from "./service";
import {
  reportStatusSchema,
  objectTypeSchema,
  createAppraisingReportSchema,
  appraisingReportSchema,
} from "@appraisal/shared/src/schemas";
import { AppraisingReport } from "@appraisal/types";

const router = new Hono();
/*
function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return c.json({ error: "Не авторизован" }, 401);
  }
  
  return true;
}
*/

function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Не авторизован" }, 401);
  }
  return null;
}

router.get("/", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const status = c.req.query("status");
    const objectType = c.req.query("objectType");
    const search = c.req.query("search");

    if (status) {
      const parsedStatus = reportStatusSchema.safeParse(status);
      if (!parsedStatus.success) {
        return c.json({ error: "Невалидный статус отчёта" }, 400);
      }
    }

    if (objectType) {
      const parsedObjectType = objectTypeSchema.safeParse(objectType);
      if (!parsedObjectType.success) {
        return c.json({ error: "Невалидный тип объекта" }, 400);
      }
    }

    const reports = await getReportsList({
      status: status as any,
      objectType,
      search,
    });

    return c.json(reports);
  } catch (error) {
    console.error("Ошибка получения списка отчётов:", error);
    return c.json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});

router.get("/:id", async (c) => {
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

    const report = await getReportById(reportId);

    if (!report) {
      return c.json({ error: "Отчёт не найден" }, 404);
    }

    return c.json(report);
  } catch (error) {
    console.error("Ошибка получения отчёта:", error);
    return c.json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});

router.post("/", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const body = await c.req.json();
    const parsed = createAppraisingReportSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const newReportIndex = await createReport(parsed.data);
    return c.json(newReportIndex, 201);
  } catch (error) {
    console.error("Ошибка создания отчёта:", error);
    return c.json(
      { error: "Внутренняя ошибка сервера при создании отчёта" },
      500,
    );
  }
});

router.put("/:id", async (c) => {
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

    const parsed = appraisingReportSchema.partial().safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const updates = parsed.data as Partial<AppraisingReport>;

    const updatedReport = await updateReport(reportId, updates);

    if (!updatedReport) {
      return c.json({ error: "Отчёт не найден" }, 404);
    }

    return c.json(updatedReport);
  } catch (error) {
    console.error("Ошибка обновления отчёта:", error);
    return c.json(
      { error: "Внутренняя ошибка сервера при обновлении отчёта" },
      500,
    );
  }
});

router.delete("/:id", async (c) => {
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

    const success = await deleteReportById(reportId);

    if (!success) {
      return c.json({ error: "Отчёт не найден" }, 404);
    }

    return c.json({ message: "Отчёт успешно удалён" });
  } catch (error) {
    console.error("Ошибка удаления отчёта:", error);
    return c.json(
      { error: "Внутренняя ошибка сервера при удалении отчёта" },
      500,
    );
  }
});

router.post("/:id/duplicate", async (c) => {
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

    const duplicatedReport = await duplicateReport(reportId);

    if (!duplicatedReport) {
      return c.json({ error: "Исходный отчёт не найден" }, 404);
    }

    return c.json(duplicatedReport, 201);
  } catch (error) {
    console.error("Ошибка дублирования отчёта:", error);
    return c.json(
      { error: "Внутренняя ошибка сервера при дублировании отчёта" },
      500,
    );
  }
});

router.patch("/:id/status", async (c) => {
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
    const parsed = z.object({ status: reportStatusSchema }).safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const updatedReport = await changeReportStatus(
      reportId,
      parsed.data.status,
    );

    if (!updatedReport) {
      return c.json({ error: "Отчёт не найден" }, 404);
    }

    return c.json(updatedReport);
  } catch (error) {
    console.error("Ошибка смены статуса отчёта:", error);
    return c.json(
      { error: "Внутренняя ошибка сервера при смене статуса" },
      500,
    );
  }
});

router.get("/:id/objects", async (c) => {
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
    if (message === "Отчёт не найден") {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});

router.get("/:id/objects/:objectId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    const objectId = c.req.param("objectId");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      )
    ) {
      return c.json({ error: "Невалидный ID отчёта" }, 400);
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        objectId,
      )
    ) {
      return c.json({ error: "Невалидный ID объекта" }, 400);
    }

    const object = await getObjectById(reportId, objectId);
    if (!object) {
      return c.json({ error: "Объект не найден" }, 404);
    }

    return c.json(object);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка получения объекта";
    if (message === "Отчёт не найден") {
      return c.json({ error: message }, 404);
    }
    return c.json({ error: message }, 500);
  }
});

router.post("/:id/objects", async (c) => {
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
    if (message === "Отчёт не найден") {
      return c.json({ error: message }, 404);
    }
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

router.put("/:id/objects/:objectId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    const objectId = c.req.param("objectId");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      )
    ) {
      return c.json({ error: "Невалидный ID отчёта" }, 400);
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        objectId,
      )
    ) {
      return c.json({ error: "Невалидный ID объекта" }, 400);
    }

    const body = await c.req.json();
    const updatedObject = await updateObjectInReport(reportId, objectId, body);
    if (!updatedObject) {
      return c.json({ error: "Объект не найден" }, 404);
    }

    return c.json(updatedObject);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка обновления объекта";
    if (message === "Отчёт не найден") {
      return c.json({ error: message }, 404);
    }
    if (
      message.includes("Невалидные данные") ||
      message.includes("не найден в отчёте")
    ) {
      return c.json({ error: message }, 400);
    }
    return c.json({ error: message }, 500);
  }
});

router.delete("/:id/objects/:objectId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    const objectId = c.req.param("objectId");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      )
    ) {
      return c.json({ error: "Невалидный ID отчёта" }, 400);
    }
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        objectId,
      )
    ) {
      return c.json({ error: "Невалидный ID объекта" }, 400);
    }

    const success = await removeObjectFromReport(reportId, objectId);
    if (!success) {
      return c.json({ error: "Объект не найден" }, 404);
    }

    return c.json({ message: "Объект успешно удалён из отчёта" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка удаления объекта";
    if (message === "Отчёт не найден") {
      return c.json({ error: message }, 404);
    }
    if (message.includes("ссылаются другие объекты")) {
      return c.json({ error: message }, 400);
    }
    return c.json({ error: message }, 500);
  }
});

export const reportsRoutes = router;
