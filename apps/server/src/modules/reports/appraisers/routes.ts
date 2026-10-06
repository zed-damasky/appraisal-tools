import { Hono } from "hono";
import { getAppraisers, addAppraiser, removeAppraiser } from "./service";

export const appraisersRouter = new Hono();

function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "Не авторизован" }, 401);
  return null;
}

appraisersRouter.get("/:id/appraisers", async (c) => {
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

    const appraisers = await getAppraisers(reportId);
    return c.json(appraisers);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка получения оценщиков";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    return c.json({ error: message }, 500);
  }
});

appraisersRouter.post("/:id/appraisers", async (c) => {
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
    const newSnapshot = await addAppraiser(reportId, body);
    return c.json(newSnapshot, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка добавления оценщика";

    if (message === "Отчёт не найден") return c.json({ error: message }, 404);

    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes("невалидные данные") ||
      lowerMessage.includes("уже привязан") ||
      lowerMessage.includes("должен быть хотя бы один") ||
      lowerMessage.includes("нет действующего полиса") ||
      lowerMessage.includes("нет действующего квалификационного аттестата")
    ) {
      return c.json({ error: message }, 400);
    }

    return c.json({ error: message }, 500);
  }
});

appraisersRouter.delete("/:id/appraisers/:appraiserId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    const appraiserId = c.req.param("appraiserId");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      ) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        appraiserId,
      )
    ) {
      return c.json({ error: "Невалидный ID" }, 400);
    }

    const success = await removeAppraiser(reportId, appraiserId);
    if (!success) return c.json({ error: "Оценщик не найден в отчёте" }, 404);

    return c.json({ message: "Оценщик успешно отвязан от отчёта" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка удаления оценщика";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    return c.json({ error: message }, 500);
  }
});
