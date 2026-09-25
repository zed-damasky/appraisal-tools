import { Hono } from "hono";
import {
  registerAppraiser,
  loginAppraiser,
  resetPassword,
  updateProfile,
  addWorkplace,
  removeWorkplace,
  addCertificate,
  removeCertificate,
  togglePrivatePractice,
} from "./service";
import {
  addCertificateSchema,
  addWorkplaceSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  togglePrivatePracticeSchema,
  updateProfileSchema,
} from "@appraisal/shared/src/schemas";
import type { Appraiser } from "@appraisal/types";

const router = new Hono();

const sessionStore = new Map<string, string>();

function sanitizeAppraiser(user: Appraiser) {
  const { passwordHash, recoveryWordsHashes, ...safe } = user;
  return safe;
}

function generateToken(): string {
  return crypto.randomUUID();
}

function getAuthenticatedEmail(c: any): string | null {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token || !sessionStore.has(token)) {
    return null;
  }
  return sessionStore.get(token)!;
}

router.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const { appraiser, password, recoveryWords } = parsed.data;

    const newUser = await registerAppraiser(appraiser, password, recoveryWords);

    return c.json(sanitizeAppraiser(newUser), 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка регистрации";
    return c.json({ error: message }, 400);
  }
});

router.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const { email, password } = parsed.data;
    const user = await loginAppraiser(email, password);

    if (!user) {
      return c.json({ error: "Неверный email или пароль" }, 401);
    }

    const token = generateToken();
    sessionStore.set(token, user.contacts.email);

    return c.json({
      token,
      user: sanitizeAppraiser(user),
    });
  } catch (error) {
    return c.json({ error: "Ошибка входа" }, 500);
  }
});

router.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token) {
    sessionStore.delete(token);
  }

  return c.json({ message: "Выход выполнен" });
});

router.post("/reset-password", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const { email, recoveryWords, newPassword } = parsed.data;
    const success = await resetPassword(email, recoveryWords, newPassword);

    if (!success) {
      return c.json({ error: "Неверные данные для восстановления" }, 400);
    }

    return c.json({ message: "Пароль успешно изменён" });
  } catch (error) {
    return c.json({ error: "Ошибка сброса пароля" }, 500);
  }
});

router.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token || !sessionStore.has(token)) {
    return c.json({ error: "Не авторизован" }, 401);
  }

  const email = sessionStore.get(token)!;
  const body = await c.req.json().catch(() => null);

  const { getAppraiserByEmail } = await import("./service");
  const user = await getAppraiserByEmail(email);

  if (!user) {
    return c.json({ error: "Пользователь не найден" }, 404);
  }

  return c.json(sanitizeAppraiser(user));
});

router.patch("/me/profile", async (c) => {
  const email = getAuthenticatedEmail(c);
  if (!email) {
    return c.json({ error: "Не авторизован" }, 401);
  }

  try {
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

router.post("/me/workplaces", async (c) => {
  const email = getAuthenticatedEmail(c);
  if (!email) {
    return c.json({ error: "Не авторизован" }, 401);
  }

  try {
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

router.delete("/me/workplaces/:id", async (c) => {
  const email = getAuthenticatedEmail(c);
  if (!email) {
    return c.json({ error: "Не авторизован" }, 401);
  }

  try {
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

router.post("/me/certificates", async (c) => {
  const email = getAuthenticatedEmail(c);
  if (!email) {
    return c.json({ error: "Не авторизован" }, 401);
  }

  try {
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

router.delete("/me/certificates/:id", async (c) => {
  const email = getAuthenticatedEmail(c);
  if (!email) {
    return c.json({ error: "Не авторизован" }, 401);
  }

  try {
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

router.patch("/me/private-practice", async (c) => {
  const email = getAuthenticatedEmail(c);
  if (!email) {
    return c.json({ error: "Не авторизован" }, 401);
  }

  try {
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

export const authRoutes = router;
