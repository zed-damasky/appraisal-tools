import { Hono } from "hono";
import { getAppSettings, updateAppSettings } from "./service";
import { settingsSchema } from "@appraisal/shared/src/schemas";

const router = new Hono();

router.get("/", async (c) => {
  const settings = await getAppSettings();
  return c.json(settings);
});

router.put("/", async (c) => {
  const body = await c.req.json();
  const parsed = settingsSchema.safeParse(body);
  
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  
  const updated = await updateAppSettings(parsed.data);
  return c.json(updated);
});

export const settingsRoutes = router;