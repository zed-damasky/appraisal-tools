import { Hono } from "hono";
import { addCertificate, removeCertificate } from "./service";
import { addCertificateSchema } from "@appraisal/shared/src/schemas";
import {
  requireAuth,
  sanitizeAppraiser,
  getAuthenticatedEmail,
} from "../session";

export const certificatesRouter = new Hono();

certificatesRouter.post("/me/certificates", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const email = getAuthenticatedEmail(c)!;
    const body = await c.req.json();
    const parsed = addCertificateSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const updatedUser = await addCertificate(email, parsed.data);
    if (!updatedUser) {
      return c.json({ error: "Пользователь не найден" }, 404);
    }

    return c.json(sanitizeAppraiser(updatedUser), 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка добавления аттестата";
    return c.json({ error: message }, 400);
  }
});

certificatesRouter.delete("/me/certificates/:id", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const email = getAuthenticatedEmail(c)!;
    const certificateId = c.req.param("id");
    const updatedUser = await removeCertificate(email, certificateId);

    if (!updatedUser) {
      return c.json({ error: "Пользователь не найден" }, 404);
    }

    return c.json(sanitizeAppraiser(updatedUser));
  } catch (error) {
    return c.json({ error: "Ошибка удаления аттестата" }, 500);
  }
});
