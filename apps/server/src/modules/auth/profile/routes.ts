import { Hono } from "hono";
import { getAppraiserByEmail, updateProfile } from "./service";
import { updateProfileSchema } from "@appraisal/shared/src/schemas";
import {
  requireAuth,
  sanitizeAppraiser,
  getAuthenticatedEmail,
} from "../session";

export const profileRouter = new Hono();

profileRouter.get("/me", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  const email = getAuthenticatedEmail(c)!;
  const user = await getAppraiserByEmail(email);

  if (!user) {
    return c.json({ error: "Пользователь не найден" }, 404);
  }

  return c.json(sanitizeAppraiser(user));
});

profileRouter.patch("/me/profile", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const email = getAuthenticatedEmail(c)!;
    const body = await c.req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const updatedUser = await updateProfile(email, parsed.data);
    if (!updatedUser) {
      return c.json({ error: "Пользователь не найден" }, 404);
    }

    return c.json(sanitizeAppraiser(updatedUser));
  } catch (error) {
    return c.json({ error: "Ошибка обновления профиля" }, 500);
  }
});
