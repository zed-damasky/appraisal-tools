import { Hono } from "hono";
import { updateReportTask } from "./service";

export const taskRouter = new Hono();

function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "Не авторизован" }, 401);
  return null;
}

taskRouter.patch("/:id/task", async (c) => {
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
    const updatedTask = await updateReportTask(reportId, body);

    if (!updatedTask) {
      return c.json({ error: "Отчёт не найден" }, 404);
    }

    return c.json(updatedTask);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка обновления задания";
    if (message === "Отчёт не найден") {
      return c.json({ error: message }, 404);
    }
    if (message.includes("Невалидные данные")) {
      return c.json({ error: message }, 400);
    }
    return c.json({ error: message }, 500);
  }
});
