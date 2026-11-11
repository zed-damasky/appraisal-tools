import type { Appraiser } from "@appraisal/types";
import { getUsers } from "../../services/storage";
import { getBaseDir } from "../../config";

export const sessionStore = new Map<string, string>();

export function sanitizeAppraiser(user: Appraiser) {
  const { passwordHash, recoveryWordsHashes, ...safe } = user;
  return safe;
}

export function generateToken(): string {
  return crypto.randomUUID();
}

export function getAuthenticatedEmail(c: any): string | null {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token || !sessionStore.has(token)) {
    return null;
  }
  return sessionStore.get(token)!;
}

export async function requireAuth(c: any): Promise<Response | null> {
  const email = getAuthenticatedEmail(c);
  if (!email) {
    return c.json({ error: "Не авторизован" }, 401);
  }

  const users = await getUsers(getBaseDir());
  const user = users.find((u) => u.contacts.email === email);

  if (!user) {
    return c.json({ error: "Пользователь не найден" }, 401);
  }

  c.set("appraiserId", user.id);

  return null;
}
