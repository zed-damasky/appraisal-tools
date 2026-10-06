import { Hono } from "hono";
import { togglePrivatePractice } from "./service";
import { togglePrivatePracticeSchema } from "@appraisal/shared/src/schemas";
import {
  requireAuth,
  sanitizeAppraiser,
  getAuthenticatedEmail,
} from "../session";

export const privatePracticeRouter = new Hono();

privatePracticeRouter.patch("/me/private-practice", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const email = getAuthenticatedEmail(c)!;
    const body = await c.req.json();
    const parsed = togglePrivatePracticeSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const { hasPrivatePractice, privatePracticeInformation } = parsed.data;
    const updatedUser = await togglePrivatePractice(
      email,
      hasPrivatePractice,
      privatePracticeInformation,
    );

    if (!updatedUser) {
      return c.json({ error: "Пользователь не найден" }, 404);
    }

    return c.json(sanitizeAppraiser(updatedUser));
  } catch (error) {
    return c.json({ error: "Ошибка обновления статуса ЧПО" }, 500);
  }
});
