import { Hono } from "hono";
import { registerAppraiser, loginAppraiser, resetPassword } from "./service";
import {
  registerSchema,
  loginSchema,
  resetPasswordSchema,
} from "@appraisal/shared/src/schemas";
import { sanitizeAppraiser, generateToken, sessionStore } from "../session";

export const authRouter = new Hono();

authRouter.post("/register", async (c) => {
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

authRouter.post("/login", async (c) => {
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

authRouter.post("/logout", async (c) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (token) {
    sessionStore.delete(token);
  }

  return c.json({ message: "Выход выполнен" });
});

authRouter.post("/reset-password", async (c) => {
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
