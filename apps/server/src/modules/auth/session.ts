import type { Appraiser } from "@appraisal/types";

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

export function requireAuth(c: any) {
  const email = getAuthenticatedEmail(c);
  if (!email) {
    return c.json({ error: "Не авторизован" }, 401);
  }
  return null;
}
