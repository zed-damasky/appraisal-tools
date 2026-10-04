import { Hono } from "hono";
import {
  getAnalogues,
  getAnalogueById,
  addAnalogue,
  updateAnalogue,
  removeAnalogue,
} from "./service";

export const analoguesRouter = new Hono();

function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) return c.json({ error: "Не авторизован" }, 401);
  return null;
}

analoguesRouter.get("/:id/analogues", async (c) => {
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

    const analogues = await getAnalogues(reportId);
    return c.json(analogues);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка получения аналогов";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    return c.json({ error: message }, 500);
  }
});

analoguesRouter.get("/:id/analogues/:analogueId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    const analogueId = c.req.param("analogueId");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      ) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        analogueId,
      )
    ) {
      return c.json({ error: "Невалидный ID" }, 400);
    }

    const analogue = await getAnalogueById(reportId, analogueId);
    if (!analogue) return c.json({ error: "Аналог не найден" }, 404);

    return c.json(analogue);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка получения аналога";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    return c.json({ error: message }, 500);
  }
});

analoguesRouter.post("/:id/analogues", async (c) => {
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
    const newAnalogue = await addAnalogue(reportId, body);
    return c.json(newAnalogue, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка добавления аналога";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    if (
      message.includes("Невалидные данные") ||
      message.includes("уже существует")
    ) {
      return c.json({ error: message }, 400);
    }
    return c.json({ error: message }, 500);
  }
});

analoguesRouter.put("/:id/analogues/:analogueId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    const analogueId = c.req.param("analogueId");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      ) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        analogueId,
      )
    ) {
      return c.json({ error: "Невалидный ID" }, 400);
    }

    const body = await c.req.json();
    const updatedAnalogue = await updateAnalogue(reportId, analogueId, body);
    if (!updatedAnalogue) return c.json({ error: "Аналог не найден" }, 404);

    return c.json(updatedAnalogue);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка обновления аналога";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    if (message.includes("Невалидные данные"))
      return c.json({ error: message }, 400);
    return c.json({ error: message }, 500);
  }
});

analoguesRouter.delete("/:id/analogues/:analogueId", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const reportId = c.req.param("id");
    const analogueId = c.req.param("analogueId");

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reportId,
      ) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        analogueId,
      )
    ) {
      return c.json({ error: "Невалидный ID" }, 400);
    }

    const success = await removeAnalogue(reportId, analogueId);
    if (!success) return c.json({ error: "Аналог не найден" }, 404);

    return c.json({ message: "Аналог успешно удалён" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка удаления аналога";
    if (message === "Отчёт не найден") return c.json({ error: message }, 404);
    return c.json({ error: message }, 500);
  }
});
