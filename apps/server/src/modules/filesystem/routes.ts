import { Hono } from "hono";
import {
  checkDirectory,
  createMarkerFile,
  verifyMarkerFile,
  listDirectory,
} from "./service";
import {
  checkPathSchema,
  createMarkerSchema,
  verifyMarkerSchema,
  listDirectorySchema,
} from "@appraisal/shared/src/schemas";

const router = new Hono();

function requireAuth(c: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json({ error: "Не авторизован" }, 401);
  }
  return null;
}

router.post("/check", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const body = await c.req.json();
    const parsed = checkPathSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const result = await checkDirectory(parsed.data.path);
    return c.json(result);
  } catch (error) {
    console.error("Ошибка проверки папки:", error);
    return c.json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});

router.post("/create-marker", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const body = await c.req.json();
    const parsed = createMarkerSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const markerData = await createMarkerFile(parsed.data.path);
    return c.json({ success: true, data: markerData }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка создания маркерного файла";
    return c.json({ error: message }, 400);
  }
});

router.post("/verify-marker", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const body = await c.req.json();
    const parsed = verifyMarkerSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const result = await verifyMarkerFile(parsed.data.path);
    return c.json(result);
  } catch (error) {
    console.error("Ошибка проверки маркера:", error);
    return c.json({ error: "Внутренняя ошибка сервера" }, 500);
  }
});

router.get("/list", async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  try {
    const dirPath = c.req.query("path");

    if (!dirPath) {
      return c.json({ error: "Параметр path обязателен" }, 400);
    }

    const parsed = listDirectorySchema.safeParse({ path: dirPath });
    if (!parsed.success) {
      return c.json({ error: parsed.error.flatten() }, 400);
    }

    const entries = await listDirectory(parsed.data.path);
    return c.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка чтения папки";
    return c.json({ error: message }, 400);
  }
});

export const filesystemRoutes = router;