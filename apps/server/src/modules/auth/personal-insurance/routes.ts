import { Hono } from "hono";
import {
  addPersonalInsurance,
  removePersonalInsurance,
  getPersonalInsurance,
} from "./service";
import { insuranceInformationSchema } from "@appraisal/shared/src/schemas";
import {
  requireAuth,
  sanitizeAppraiser,
  getAuthenticatedEmail,
} from "../session";

export const personalInsuranceRouter = new Hono();

personalInsuranceRouter.get("/me/personal-insurance", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const email = getAuthenticatedEmail(c)!;
    const insuranceList = await getPersonalInsurance(email);

    if (insuranceList === null) {
      return c.json({ error: "Пользователь не найден" }, 404);
    }

    return c.json(insuranceList);
  } catch (error) {
    return c.json({ error: "Ошибка получения полисов" }, 500);
  }
});

personalInsuranceRouter.post("/me/personal-insurance", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const email = getAuthenticatedEmail(c)!;
    const body = await c.req.json();
    const parsed = insuranceInformationSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const updatedUser = await addPersonalInsurance(email, parsed.data);
    if (!updatedUser) {
      return c.json({ error: "Пользователь не найден" }, 404);
    }

    return c.json(sanitizeAppraiser(updatedUser), 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка добавления полиса";
    return c.json({ error: message }, 400);
  }
});

personalInsuranceRouter.delete("/me/personal-insurance/:id", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const email = getAuthenticatedEmail(c)!;
    const insuranceId = c.req.param("id");
    const updatedUser = await removePersonalInsurance(email, insuranceId);

    if (!updatedUser) {
      return c.json({ error: "Пользователь не найден" }, 404);
    }

    return c.json(sanitizeAppraiser(updatedUser));
  } catch (error) {
    return c.json({ error: "Ошибка удаления полиса" }, 500);
  }
});
