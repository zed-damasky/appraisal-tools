import { Hono } from "hono";
import { addWorkplace, removeWorkplace } from "./service";
import { addWorkplaceSchema } from "@appraisal/shared/src/schemas";
import {
  requireAuth,
  sanitizeAppraiser,
  getAuthenticatedEmail,
} from "../session";

export const workplacesRouter = new Hono();

workplacesRouter.post("/me/workplaces", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const email = getAuthenticatedEmail(c)!;
    const body = await c.req.json();
    const parsed = addWorkplaceSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const updatedUser = await addWorkplace(email, parsed.data);
    if (!updatedUser) {
      return c.json({ error: "Пользователь не найден" }, 404);
    }

    return c.json(sanitizeAppraiser(updatedUser), 201);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Ошибка добавления рабочего места";
    return c.json({ error: message }, 400);
  }
});

workplacesRouter.delete("/me/workplaces/:id", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const email = getAuthenticatedEmail(c)!;
    const workplaceId = c.req.param("id");
    const updatedUser = await removeWorkplace(email, workplaceId);

    if (!updatedUser) {
      return c.json({ error: "Пользователь не найден" }, 404);
    }

    return c.json(sanitizeAppraiser(updatedUser));
  } catch (error) {
    return c.json({ error: "Ошибка удаления рабочего места" }, 500);
  }
});
