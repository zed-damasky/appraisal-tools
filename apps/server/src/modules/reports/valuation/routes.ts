import { Hono } from "hono";
import { updateValuationResults } from "./service";

export const valuationRouter = new Hono();

function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "Не авторизован" }, 401);
  return null;
}

valuationRouter.patch("/:id/valuation", async (c) => {
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
    const updated = await updateValuationResults(reportId, body);

    if (!updated) {
      return c.json({ error: "Отчёт не найден" }, 404);
    }

    return c.json(updated);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ошибка обновления результатов оценки";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    if (message.includes("Невалидные данные"))
      return c.json({ error: message }, 400);
    return c.json({ error: message }, 500);
  }
});
